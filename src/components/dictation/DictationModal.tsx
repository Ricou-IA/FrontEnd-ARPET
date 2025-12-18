// ============================================================
// ARPET - DictationModal Component
// Version: 1.0.4 - Titre avec date/heure + transcript dans messages
// Date: 2025-12-18
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { X, Mic, Square, Loader2, MessageSquare, Pin, AlertCircle, RotateCcw } from 'lucide-react'
import { useAudioRecorder, formatDuration } from '@/hooks/useAudioRecorder'
import { transcribeAudio, isAudioRecordingSupported } from '@/services/dictation.service'
import { createSandboxItem } from '@/services/sandbox.service'
import { createEmptySandboxContent } from '@/types'
import { useAppStore } from '@/stores/appStore'

// ============================================================
// TYPES
// ============================================================

type DictationStep = 'idle' | 'recording' | 'transcribing' | 'ready' | 'error'

interface DictationModalProps {
  isOpen: boolean
  onClose: () => void
  /** Callback quand l'utilisateur choisit "Poser au RAG" */
  onSendToChat: (text: string) => void
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Formate la date/heure pour le titre : "18-12-2025 à 15h30"
 */
function formatDateTimeForTitle(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  
  return `${day}-${month}-${year} à ${hours}h${minutes}`
}

// ============================================================
// COMPONENT
// ============================================================

export function DictationModal({ isOpen, onClose, onSendToChat }: DictationModalProps) {
  // États
  const [step, setStep] = useState<DictationStep>('idle')
  const [transcript, setTranscript] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [isSavingToSandbox, setIsSavingToSandbox] = useState(false)
  const [waitingForBlob, setWaitingForBlob] = useState(false)

  // Store Zustand - pour rafraîchir le sandbox après création
  const fetchSandboxItems = useAppStore((s) => s.fetchSandboxItems)

  // Hook d'enregistrement audio
  const {
    isRecording,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    reset: resetRecorder,
    error: recorderError,
  } = useAudioRecorder()

  // Vérifier le support navigateur
  const isSupported = isAudioRecordingSupported()

  // ============================================================
  // EFFECTS
  // ============================================================

  // Gérer les erreurs du recorder
  useEffect(() => {
    if (recorderError) {
      console.log('❌ recorderError:', recorderError)
      setErrorMessage(recorderError)
      setStep('error')
      setWaitingForBlob(false)
    }
  }, [recorderError])

  // Quand l'enregistrement s'arrête et qu'on a un blob, lancer la transcription
  useEffect(() => {
    if (audioBlob && waitingForBlob) {
      console.log('✅ Blob reçu, lancement transcription')
      setWaitingForBlob(false)
      handleTranscription(audioBlob)
    }
  }, [audioBlob, waitingForBlob])

  // Reset quand la modale s'ouvre
  useEffect(() => {
    if (isOpen) {
      handleReset()
    }
  }, [isOpen])

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleClose = useCallback(() => {
    setIsClosing(true)
    // Arrêter l'enregistrement si en cours
    if (isRecording) {
      stopRecording()
    }
    setTimeout(() => {
      setIsClosing(false)
      handleReset()
      onClose()
    }, 150)
  }, [isRecording, stopRecording, onClose])

  const handleReset = useCallback(() => {
    setStep('idle')
    setTranscript('')
    setErrorMessage(null)
    setWaitingForBlob(false)
    resetRecorder()
  }, [resetRecorder])

  const handleStartRecording = async () => {
    console.log('🔴 handleStartRecording appelé')
    setErrorMessage(null)
    setStep('recording')
    await startRecording()
  }

  const handleStopRecording = () => {
    console.log('⏹️ handleStopRecording appelé')
    // On indique qu'on attend le blob, le step changera quand le blob arrive
    setWaitingForBlob(true)
    setStep('transcribing')
    stopRecording()
  }

  const handleTranscription = async (blob: Blob) => {
    console.log('🎤 handleTranscription appelé, blob size:', blob.size)
    setStep('transcribing')
    setErrorMessage(null)

    const { data, error } = await transcribeAudio(blob)
    console.log('🎤 transcribeAudio result:', { data, error })

    if (error || !data) {
      setErrorMessage(error?.message || 'Erreur lors de la transcription')
      setStep('error')
      return
    }

    setTranscript(data.transcript)
    setStep('ready')
  }

  const handleSendToChat = () => {
    if (!transcript.trim()) return
    onSendToChat(transcript.trim())
    handleClose()
  }

  const handleSaveToSandbox = async () => {
    if (!transcript.trim() || isSavingToSandbox) return

    setIsSavingToSandbox(true)

    try {
      const now = new Date()
      
      // ✅ Titre avec date/heure : "🎤 Audio du 18-12-2025 à 15h30"
      const title = `🎤 Audio du ${formatDateTimeForTitle(now)}`

      // Créer un item sandbox avec le transcript dans les messages
      const content = createEmptySandboxContent(title, transcript.trim())
      
      const contentWithSource = {
        ...content,
        source_type: 'voice_note' as const,
        initial_prompt: transcript.trim(),
        // ✅ Transcript complet comme premier message
        messages: [
          {
            role: 'user' as const,
            text: transcript.trim(),
            at: now.toISOString(),
          }
        ],
      }

      const result = await createSandboxItem({
        title,
        content: contentWithSource,
      })

      if (result.data) {
        // ✅ Rafraîchir la liste du sandbox dans le store
        await fetchSandboxItems()
        // Succès - fermer la modale
        handleClose()
      } else {
        throw new Error('Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur sauvegarde sandbox:', error)
      setErrorMessage('Erreur lors de la sauvegarde dans le Sandbox')
    } finally {
      setIsSavingToSandbox(false)
    }
  }

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const renderIdleState = () => (
    <div className="flex flex-col items-center gap-6 py-8">
      {!isSupported ? (
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-stone-600 dark:text-stone-400">
            Votre navigateur ne supporte pas l'enregistrement audio.
          </p>
          <p className="text-sm text-stone-500 dark:text-stone-500 mt-2">
            Essayez avec Chrome, Firefox ou Safari.
          </p>
        </div>
      ) : (
        <>
          <button
            onClick={handleStartRecording}
            className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
          >
            <Mic className="w-10 h-10 text-white" />
          </button>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            Cliquez pour commencer l'enregistrement
          </p>
        </>
      )}
    </div>
  )

  const renderRecordingState = () => (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Indicateur d'enregistrement animé */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
          <Mic className="w-10 h-10 text-white" />
        </div>
        {/* Cercle pulsant */}
        <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
      </div>

      {/* Timer */}
      <div className="text-2xl font-mono text-stone-700 dark:text-stone-300">
        {formatDuration(duration)}
      </div>

      {/* Bouton arrêter */}
      <button
        onClick={handleStopRecording}
        className="flex items-center gap-2 px-6 py-3 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800 rounded-xl hover:bg-stone-900 dark:hover:bg-stone-300 transition font-medium"
      >
        <Square className="w-4 h-4" />
        Arrêter l'enregistrement
      </button>

      <p className="text-stone-400 dark:text-stone-500 text-xs">
        Parlez clairement près du microphone
      </p>
    </div>
  )

  const renderTranscribingState = () => (
    <div className="flex flex-col items-center gap-6 py-12">
      <Loader2 className="w-12 h-12 text-stone-400 animate-spin" />
      <div className="text-center">
        <p className="text-stone-600 dark:text-stone-400 font-medium">
          Transcription en cours...
        </p>
        <p className="text-stone-400 dark:text-stone-500 text-sm mt-1">
          Cela peut prendre quelques secondes
        </p>
      </div>
    </div>
  )

  const renderReadyState = () => (
    <div className="flex flex-col gap-4">
      {/* Zone de texte éditable */}
      <div className="relative">
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="w-full h-40 p-4 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-700 dark:text-stone-300 resize-none focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500"
          placeholder="Transcription..."
        />
        <span className="absolute bottom-2 right-3 text-xs text-stone-400 dark:text-stone-500">
          {transcript.length} caractères
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSendToChat}
          disabled={!transcript.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MessageSquare className="w-4 h-4" />
          Poser au RAG
        </button>
        <button
          onClick={handleSaveToSandbox}
          disabled={!transcript.trim() || isSavingToSandbox}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800 rounded-xl hover:bg-stone-900 dark:hover:bg-stone-300 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSavingToSandbox ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Pin className="w-4 h-4" />
          )}
          Ajouter au Sandbox
        </button>
      </div>

      {/* Bouton recommencer */}
      <button
        onClick={handleReset}
        className="flex items-center justify-center gap-2 text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 text-sm mt-2"
      >
        <RotateCcw className="w-3 h-3" />
        Recommencer
      </button>
    </div>
  )

  const renderErrorState = () => (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <div className="text-center">
        <p className="text-stone-700 dark:text-stone-300 font-medium mb-2">
          Une erreur est survenue
        </p>
        <p className="text-stone-500 dark:text-stone-400 text-sm max-w-sm">
          {errorMessage}
        </p>
      </div>
      <button
        onClick={handleReset}
        className="flex items-center gap-2 px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition"
      >
        <RotateCcw className="w-4 h-4" />
        Réessayer
      </button>
    </div>
  )

  // ============================================================
  // RENDER
  // ============================================================

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-150 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={`relative bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-150 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Mic className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                Dictée rapide
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {step === 'recording' && 'Enregistrement en cours...'}
                {step === 'transcribing' && 'Transcription...'}
                {step === 'ready' && 'Prêt à envoyer'}
                {step === 'idle' && 'Prêt à enregistrer'}
                {step === 'error' && 'Erreur'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {step === 'idle' && renderIdleState()}
          {step === 'recording' && renderRecordingState()}
          {step === 'transcribing' && renderTranscribingState()}
          {step === 'ready' && renderReadyState()}
          {step === 'error' && renderErrorState()}
        </div>
      </div>
    </div>
  )
}

export default DictationModal
