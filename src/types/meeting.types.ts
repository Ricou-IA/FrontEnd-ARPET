// ============================================
// RÉUNIONS (MEETINGS) - Phase 2.2
// ============================================

/**
 * Étapes de la modale d'enregistrement de réunion
 */
export type MeetingStep = 'prepare' | 'record' | 'processing' | 'review';

/**
 * Statut du traitement de l'audio
 */
export type MeetingProcessingStatus =
  | 'idle'
  | 'uploading'
  | 'transcribing'
  | 'analyzing'
  | 'completed'
  | 'error';

/**
 * Structure d'un point d'action extrait du CR
 */
export interface MeetingActionItem {
  id: string;
  who: string;
  what: string;
  when: string | null;
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Structure du CR généré
 */
export interface MeetingCR {
  summary: string;
  decisions: string[];
  action_items: MeetingActionItem[];
  open_questions: string[];
  key_points: string[];
}

/**
 * Données de préparation de la réunion (étape 1)
 */
export interface MeetingPrepareData {
  title: string;
  participants?: string;
  agenda?: string;
}

/**
 * Réponse de l'Edge Function process-audio
 */
export interface ProcessAudioResponse {
  success: boolean;
  meeting_id: string;
  transcript: string;
  summary: string;
  action_items: MeetingActionItem[];
  audio_url: string;
  storage_path: string;
  error?: string;
}

/**
 * Configuration des labels de progression
 */
export const MEETING_PROCESSING_LABELS: Record<MeetingProcessingStatus, string> = {
  idle: 'En attente',
  uploading: 'Envoi de l\'audio...',
  transcribing: 'Transcription en cours...',
  analyzing: 'Analyse et génération du CR...',
  completed: 'Terminé !',
  error: 'Erreur',
};

// ============================================
// HELPERS MEETINGS
// ============================================

/**
 * Formate une durée en secondes en format mm:ss ou hh:mm:ss
 */
export function formatMeetingDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Génère un titre par défaut pour une réunion
 */
export function generateMeetingDefaultTitle(): string {
  const now = new Date();
  const date = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const time = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return `Réunion du ${date} à ${time}`;
}
