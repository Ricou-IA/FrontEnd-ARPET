// ============================================================
// ARPET - useAudioRecorder Hook
// Version: 1.0.0 - Hook pour enregistrement audio via MediaRecorder API
// Date: 2025-12-18
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react'

export interface UseAudioRecorderReturn {
  /** État d'enregistrement en cours */
  isRecording: boolean
  /** Durée de l'enregistrement en secondes */
  duration: number
  /** Blob audio après arrêt de l'enregistrement */
  audioBlob: Blob | null
  /** Démarrer l'enregistrement */
  startRecording: () => Promise<void>
  /** Arrêter l'enregistrement */
  stopRecording: () => void
  /** Réinitialiser l'état */
  reset: () => void
  /** Erreur éventuelle */
  error: string | null
  /** Permission microphone accordée */
  hasPermission: boolean | null
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  // États
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Nettoyer le timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Nettoyer le stream
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      clearTimer()
      cleanupStream()
    }
  }, [clearTimer, cleanupStream])

  // Démarrer l'enregistrement
  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setAudioBlob(null)
      audioChunksRef.current = []

      // Vérifier le support MediaRecorder
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Votre navigateur ne supporte pas l\'enregistrement audio')
      }

      // Demander l'accès au microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      })
      
      streamRef.current = stream
      setHasPermission(true)

      // Déterminer le format supporté
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      // Créer le MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      // Collecter les chunks audio
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      // Quand l'enregistrement s'arrête
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        setAudioBlob(audioBlob)
        cleanupStream()
        clearTimer()
      }

      // Gérer les erreurs
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setError('Erreur lors de l\'enregistrement')
        cleanupStream()
        clearTimer()
        setIsRecording(false)
      }

      // Démarrer l'enregistrement
      mediaRecorder.start(1000) // Chunk toutes les secondes
      setIsRecording(true)
      setDuration(0)

      // Timer pour la durée
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)

    } catch (err) {
      console.error('Error starting recording:', err)
      setHasPermission(false)
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Accès au microphone refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.')
        } else if (err.name === 'NotFoundError') {
          setError('Aucun microphone détecté sur votre appareil.')
        } else {
          setError(err.message)
        }
      } else {
        setError('Erreur inconnue lors de l\'accès au microphone')
      }
    }
  }, [cleanupStream, clearTimer])

  // Arrêter l'enregistrement
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [])

  // Réinitialiser l'état
  const reset = useCallback(() => {
    clearTimer()
    cleanupStream()
    setIsRecording(false)
    setDuration(0)
    setAudioBlob(null)
    setError(null)
    audioChunksRef.current = []
    mediaRecorderRef.current = null
  }, [clearTimer, cleanupStream])

  return {
    isRecording,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    reset,
    error,
    hasPermission,
  }
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Formate une durée en secondes en format MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
