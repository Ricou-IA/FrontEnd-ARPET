// ============================================
// MEETINGS - Phase V3 (Meeting Module V3)
// ============================================

// ============================================
// SOURCE TYPES
// ============================================

/**
 * Types de source pour les meetings
 * - recording : enregistrement live via MediaRecorder
 * - uploaded_audio : fichier audio importé (mp3, m4a, wav, webm, ogg)
 * - visio_bot : capture via bot Recall.ai (V2)
 * - memo : mémo vocal rapide (1 locuteur, layer user)
 * - uploaded_cr : CR uploadé manuellement (legacy)
 * - manual : saisie manuelle (legacy)
 */
export type MeetingSourceType =
  | 'recording'
  | 'uploaded_audio'
  | 'visio_bot'
  | 'memo'
  | 'uploaded_cr'
  | 'manual';

// ============================================
// PROCESSING STATUS
// ============================================

/**
 * Etapes de la modale d'enregistrement de reunion
 */
export type MeetingStep = 'prepare' | 'record' | 'processing' | 'review';

/**
 * Statut du traitement de l'audio
 * - idle : en attente
 * - uploading : envoi audio vers Storage
 * - transcribing : transcription Gladia en cours
 * - transcribed : transcript disponible, en attente d'extraction
 * - analyzing : extraction LLM en cours
 * - completed : tout le pipeline est termine
 * - error : erreur a une etape
 */
export type MeetingProcessingStatus =
  | 'idle'
  | 'uploading'
  | 'transcribing'
  | 'transcribed'
  | 'analyzing'
  | 'completed'
  | 'error';

/**
 * Statut d'extraction cote DB (arpet.meetings.extraction_status)
 */
export type MeetingExtractionStatus =
  | 'pending'
  | 'processing'
  | 'transcribed'
  | 'extracted'
  | 'done'
  | 'error';

// ============================================
// PARTICIPANTS
// ============================================

/**
 * Participant enrichi avec mapping speaker Gladia
 */
export interface MeetingParticipantEnriched {
  /** ID du speaker Gladia (0, 1, 2...) */
  speaker_id: number;
  /** Nom affiche (mappe ou "Speaker X") */
  name: string;
  /** Role / fonction */
  role?: string;
  /** Entreprise */
  company?: string;
  /** Reference vers core.intervenants */
  intervenant_id?: string;
  /** Niveau de confiance du mapping */
  confidence: 'confirmed' | 'unmatched' | 'suggested';
  /** Methode de matching */
  matched_by: 'user' | 'history' | 'content' | null;
}

// ============================================
// ITEMS
// ============================================

/**
 * Type d'item extrait d'une reunion
 */
export type MeetingItemType = 'decision' | 'action' | 'issue' | 'info';

/**
 * Statut d'un item
 */
export type MeetingItemStatus = 'open' | 'in_progress' | 'done' | 'cancelled';

/**
 * Item extrait d'une reunion (decision, action, issue, info)
 * Correspond a la table arpet.meeting_items
 */
export interface MeetingItem {
  id: string;
  meeting_id?: string;
  item_type: MeetingItemType;
  subject: string;
  content: string;
  context?: string;
  lot_reference: string | null;
  responsible: string | null;
  due_date: string | null;
  status: MeetingItemStatus;
  /** Localisation (batiment, zone) */
  location?: string;
  /** Tags thematiques pour regroupement par topic */
  topic_tags: string[];
  /** References documentaires citees ("CCTP page 34", "DTU 25.41") */
  related_documents?: string[];
  /** Ordre d'affichage */
  display_order?: number;
  status_updated_at?: string;
  status_updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// LEGACY TYPES (backward compat)
// ============================================

/**
 * Structure d'un point d'action extrait du CR (legacy Phase 2.2)
 * @deprecated Use MeetingItem instead
 */
export interface MeetingActionItem {
  id: string;
  who: string;
  what: string;
  when: string | null;
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Structure du CR genere (legacy Phase 2.2)
 * @deprecated Replaced by formatted_report + MeetingItem[] in V3
 */
export interface MeetingCR {
  summary: string;
  decisions: string[];
  action_items: MeetingActionItem[];
  open_questions: string[];
  key_points: string[];
}

// ============================================
// PREPARE DATA
// ============================================

/**
 * Donnees de preparation de la reunion (etape 1)
 */
export interface MeetingPrepareData {
  title: string;
  participants?: string;
  agenda?: string;
  /** Type de source (default: 'recording' for backward compat) */
  source_type?: MeetingSourceType;
  /** ID du projet (obligatoire) */
  project_id: string;
  /** ID de l'organisation */
  org_id: string;
}

// ============================================
// MEMO EXTRACTION
// ============================================

/**
 * Extraction allegee pour les memos vocaux
 * Les memos sont courts (<5min, 1 locuteur) et n'ont pas de CR formel
 */
export interface MemoExtraction {
  /** Sujet detecte */
  subject: string;
  /** Mots-cles / tags */
  tags: string[];
  /** Actions eventuelles (si detectees) */
  actions?: string[];
  /** Lot concerne (si detectable) */
  lot_reference?: string;
  /** Localisation (si detectable) */
  location?: string;
}

// ============================================
// MEETING DB RECORD
// ============================================

/**
 * Enregistrement meeting complet (correspond a arpet.meetings)
 */
export interface Meeting {
  id: string;
  org_id: string;
  project_id: string | null;
  meeting_date: string;
  meeting_title: string | null;
  duration_minutes: number | null;
  participants: MeetingParticipantEnriched[] | null;
  source_type: MeetingSourceType;
  source_file_id: string | null;
  audio_url: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  summary: string | null;
  formatted_report: string | null;
  next_meeting_date: string | null;
  transcript_path: string | null;
  extraction_status: MeetingExtractionStatus;
  extraction_error: string | null;
  model_used: string | null;
  shared_with_team: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// API RESPONSES
// ============================================

/**
 * Reponse de l'Edge Function meeting-transcribe
 */
export interface TranscribeResponse {
  success: boolean;
  meeting_id: string;
  transcript_text: string;
  speakers_count: number;
  transcript_path: string;
  error?: string;
}

/**
 * Reponse de l'Edge Function meeting-extract
 */
export interface ExtractResponse {
  success: boolean;
  meeting_id: string;
  summary: string;
  items_count: number;
  items: MeetingItem[];
  formatted_report: string;
  error?: string;
}

/**
 * Reponse legacy de process-audio (Phase 2.2, retro-compat)
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

// ============================================
// UI CONFIG
// ============================================

/**
 * Configuration des labels de progression
 */
export const MEETING_PROCESSING_LABELS: Record<MeetingProcessingStatus, string> = {
  idle: 'En attente',
  uploading: 'Envoi de l\'audio...',
  transcribing: 'Transcription en cours...',
  transcribed: 'Transcript disponible',
  analyzing: 'Analyse et extraction...',
  completed: 'Termin\u00e9 !',
  error: 'Erreur',
};

/**
 * Labels pour les types de source
 */
export const SOURCE_TYPE_LABELS: Record<MeetingSourceType, string> = {
  recording: 'Enregistrement',
  uploaded_audio: 'Audio import\u00e9',
  visio_bot: 'Visio (bot)',
  memo: 'M\u00e9mo vocal',
  uploaded_cr: 'CR import\u00e9',
  manual: 'Saisie manuelle',
};

/**
 * Icones pour les types de source
 */
export const SOURCE_TYPE_ICONS: Record<MeetingSourceType, string> = {
  recording: '\uD83C\uDFA4',
  uploaded_audio: '\uD83D\uDCC1',
  visio_bot: '\uD83D\uDCBB',
  memo: '\uD83D\uDDE3\uFE0F',
  uploaded_cr: '\uD83D\uDCC4',
  manual: '\u270D\uFE0F',
};

/**
 * Formats audio acceptes pour l'upload
 */
export const ACCEPTED_AUDIO_FORMATS = [
  'audio/mpeg',       // mp3
  'audio/mp4',        // m4a
  'audio/x-m4a',      // m4a (alternative)
  'audio/wav',        // wav
  'audio/x-wav',      // wav (alternative)
  'audio/webm',       // webm
  'audio/ogg',        // ogg
] as const;

export const ACCEPTED_AUDIO_EXTENSIONS = '.mp3,.m4a,.wav,.webm,.ogg';

// ============================================
// HELPERS
// ============================================

/**
 * Formate une duree en secondes en format mm:ss ou hh:mm:ss
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
 * Genere un titre par defaut pour une reunion
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
  return `R\u00e9union du ${date} \u00e0 ${time}`;
}

/**
 * Genere un titre par defaut pour un memo vocal
 */
export function generateMemoDefaultTitle(): string {
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
  return `M\u00e9mo du ${date} \u00e0 ${time}`;
}

/**
 * Verifie si un fichier audio a un format accepte
 */
export function isAcceptedAudioFormat(mimeType: string): boolean {
  return (ACCEPTED_AUDIO_FORMATS as readonly string[]).includes(mimeType);
}

/**
 * Verifie si un source_type correspond a un memo
 */
export function isMemoType(sourceType: MeetingSourceType): boolean {
  return sourceType === 'memo';
}

/**
 * Verifie si un source_type necessite la diarisation
 */
export function needsDiarization(sourceType: MeetingSourceType): boolean {
  return sourceType !== 'memo';
}
