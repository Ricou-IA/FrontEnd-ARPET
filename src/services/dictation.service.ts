// ============================================================
// ARPET - Dictation Service
// Version: 1.0.2 - Fix Supabase URL
// Date: 2025-12-18
// ============================================================

import { supabase } from '../lib/supabase'

// ============================================================
// TYPES
// ============================================================

export interface TranscriptionResult {
  success: boolean
  transcript: string
  duration_seconds: number
  error?: string
}

export interface DictationServiceResult<T> {
  data: T | null
  error: Error | null
}

// ============================================================
// TRANSCRIPTION
// ============================================================

/**
 * Envoie un fichier audio à l'Edge Function pour transcription via Whisper
 */
export async function transcribeAudio(
  audioBlob: Blob
): Promise<DictationServiceResult<TranscriptionResult>> {
  try {
    console.log('🎤 Envoi audio pour transcription...', {
      size: `${(audioBlob.size / 1024).toFixed(1)} KB`,
      type: audioBlob.type,
    })

    // Préparer le FormData
    const formData = new FormData()
    
    // Déterminer l'extension selon le type MIME
    const extension = audioBlob.type.includes('webm') ? 'webm' : 'mp4'
    const filename = `dictation_${Date.now()}.${extension}`
    
    // Créer un File à partir du Blob
    const audioFile = new File([audioBlob], filename, { type: audioBlob.type })
    formData.append('audio', audioFile)

    // Récupérer le token d'authentification
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }

    // URL Supabase - utilise la variable d'environnement ou fallback
    const supabaseUrl = 'https://odspcxgafcqxjzrarsqf.supabase.co'

    console.log('📡 Appel Edge Function:', `${supabaseUrl}/functions/v1/transcribe-dictation`)

    // Appeler l'Edge Function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/transcribe-dictation`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ Erreur HTTP:', response.status, errorData)
      throw new Error(errorData.error || `Erreur HTTP ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Erreur de transcription')
    }

    console.log('✅ Transcription reçue:', {
      length: result.transcript?.length,
      duration: result.duration_seconds,
    })

    return {
      data: {
        success: true,
        transcript: result.transcript,
        duration_seconds: result.duration_seconds,
      },
      error: null,
    }

  } catch (error) {
    console.error('❌ Erreur transcription:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Erreur inconnue'),
    }
  }
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Vérifie si le navigateur supporte l'enregistrement audio
 */
export function isAudioRecordingSupported(): boolean {
  return Boolean(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined'
  )
}

/**
 * Vérifie les permissions microphone
 */
export async function checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    // L'API Permissions n'est pas supportée partout
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      return result.state
    }
    // Fallback: on ne sait pas, on retourne 'prompt'
    return 'prompt'
  } catch {
    return 'prompt'
  }
}
