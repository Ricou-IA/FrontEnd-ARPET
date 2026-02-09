/**
 * Meeting Service - Phase V3
 * Version: 4.0.0 - Meeting V3 avec modes upload/memo, history, item updates
 * Gestion des enregistrements de reunions avec extraction decisions/actions
 */

import { supabase } from '../lib/supabase';
export { formatDuration } from '../utils/formatters';

// ============================================================
// IMPORTS FROM TYPES
// ============================================================

import type {
  MeetingSourceType,
  MeetingProcessingStatus,
  MeetingExtractionStatus,
  MeetingParticipantEnriched,
  MeetingItem,
  MeetingItemType,
  MeetingItemStatus,
  MeetingPrepareData,
  Meeting,
} from '../types/meeting.types';

// Re-export types for backward compatibility
export type {
  MeetingSourceType,
  MeetingProcessingStatus,
  MeetingExtractionStatus,
  MeetingParticipantEnriched,
  MeetingItem,
  MeetingItemType,
  MeetingItemStatus,
  MeetingPrepareData,
  Meeting,
};

// ============================================================
// CONSTANTES
// ============================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Storage bucket for audio files
const AUDIO_STORAGE_BUCKET = 'project-recordings';

// ============================================================
// TYPES INTERNES
// ============================================================

interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Participant simple (legacy, retro-compat)
 */
export interface MeetingParticipant {
  name: string;
  role?: string;
}

/**
 * Reponse de l'Edge Function meeting-transcribe (legacy format)
 */
export interface ProcessAudioResponse {
  success: boolean;
  meeting_id: string;
  audio_url: string;
  transcript: string;

  // Donnees structurees extraites
  meeting: {
    meeting_date: string | null;
    meeting_title: string;
    participants: MeetingParticipant[];
    summary: string;
    decisions_count: number;
    actions_count: number;
    issues_count: number;
  };

  // Items extraits (decisions, actions, issues)
  items: MeetingItem[];

  // Erreur eventuelle
  error?: string;
}

/**
 * Labels de progression pour l'UI
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

// ============================================================
// UTILITAIRES
// ============================================================

/**
 * Convertit un Blob en base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Retirer le prefixe "data:audio/webm;base64," pour n'avoir que le base64 pur
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Utilitaire sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// TRAITEMENT AUDIO (Edge Function meeting-transcribe)
// ============================================================

/**
 * Envoie l'audio a l'Edge Function meeting-transcribe pour traitement
 * @param audioBlob - Blob audio enregistre
 * @param prepareData - Donnees de preparation (titre, participants, project_id, org_id)
 * @param onStatusChange - Callback pour suivre la progression
 */
export async function processAudio(
  audioBlob: Blob,
  prepareData: MeetingPrepareData,
  onStatusChange?: (status: MeetingProcessingStatus) => void
): Promise<ServiceResult<ProcessAudioResponse>> {
  try {
    // Recuperer la session utilisateur
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Utilisateur non connect\u00e9');
    }

    onStatusChange?.('uploading');

    // Convertir le Blob audio en base64
    if (import.meta.env.DEV) console.log('[MeetingService] Conversion audio en base64...');
    const audioBase64 = await blobToBase64(audioBlob);

    // Generer un nom de fichier
    const fileName = `meeting_${Date.now()}.webm`;

    // Preparer le payload JSON (format attendu par l'Edge Function)
    const payload = {
      audio_base64: audioBase64,
      file_name: fileName,
      project_id: prepareData.project_id,
      org_id: prepareData.org_id,
      created_by: session.user.id,
      meeting_date: new Date().toISOString().split('T')[0],
      meeting_title: prepareData.title,
      source_type: prepareData.source_type || 'recording',
      // Enrichissement pour GPT
      participants_hint: prepareData.participants || undefined,
      agenda: prepareData.agenda || undefined,
    };

    if (import.meta.env.DEV) console.log('[MeetingService] Envoi JSON a meeting-transcribe...', {
      title: prepareData.title,
      fileName,
      audioSize: audioBlob.size,
      base64Length: audioBase64.length,
      mimeType: audioBlob.type,
      project_id: prepareData.project_id,
      org_id: prepareData.org_id,
      source_type: prepareData.source_type,
      created_by: session.user.id,
      participants_hint: prepareData.participants || '(non fourni)',
      agenda: prepareData.agenda || '(non fourni)',
    });

    onStatusChange?.('transcribing');

    // Appeler l'Edge Function meeting-transcribe avec JSON
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/meeting-transcribe`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (import.meta.env.DEV) console.error('[MeetingService] Edge Function error:', errorData);
      onStatusChange?.('error');
      throw new Error(errorData.error || `Erreur ${response.status}`);
    }

    const data = await response.json();
    if (import.meta.env.DEV) console.log('[MeetingService] meeting-transcribe response:', data);

    onStatusChange?.('analyzing');
    await sleep(300);
    onStatusChange?.('completed');

    // Parser la reponse de meeting-transcribe
    const meetingData = data.meeting || {};
    const stats = data.stats || {};

    const result: ProcessAudioResponse = {
      success: data.success ?? true,
      meeting_id: meetingData.id || '',
      audio_url: meetingData.audio_url || '',
      transcript: data.transcript || '',  // Transcript retourne par le backend

      meeting: {
        meeting_date: meetingData.meeting_date || null,
        meeting_title: meetingData.meeting_title || prepareData.title,
        participants: parseParticipants(meetingData.participants),
        summary: meetingData.summary || '',
        decisions_count: stats.decisions || 0,
        actions_count: stats.actions || 0,
        issues_count: stats.issues || 0,
      },

      // Les items sont dans meetingData.items
      items: parseItems(meetingData.items),

      error: data.error,
    };

    return { data: result, error: null };
  } catch (error) {
    console.error('[MeetingService] processAudio error:', error);
    onStatusChange?.('error');
    return { data: null, error: error as Error };
  }
}

// ============================================================
// UPLOAD AUDIO FILE (V3)
// ============================================================

/**
 * Upload un fichier audio vers Supabase Storage
 * @param file - Fichier audio (mp3, m4a, wav, webm, ogg)
 * @param projectId - ID du projet
 * @param orgId - ID de l'organisation
 * @returns Storage path du fichier uploade
 */
export async function uploadAudioFile(
  file: File,
  projectId: string,
  orgId: string
): Promise<ServiceResult<{ storagePath: string; signedUrl: string }>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Utilisateur non connect\u00e9');
    }

    // Generer un nom de fichier unique
    const extension = file.name.split('.').pop() || 'audio';
    const fileName = `${orgId}/${projectId}/uploaded_${Date.now()}.${extension}`;

    if (import.meta.env.DEV) console.log('[MeetingService] Uploading audio file:', {
      originalName: file.name,
      size: file.size,
      type: file.type,
      storagePath: fileName,
    });

    // Upload vers Supabase Storage
    const { data, error } = await supabase.storage
      .from(AUDIO_STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      throw error;
    }

    // Generer une signed URL pour l'acces
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(AUDIO_STORAGE_BUCKET)
      .createSignedUrl(data.path, 3600 * 24); // 24h

    if (signedUrlError) {
      throw signedUrlError;
    }

    return {
      data: {
        storagePath: data.path,
        signedUrl: signedUrlData.signedUrl,
      },
      error: null,
    };
  } catch (error) {
    console.error('[MeetingService] uploadAudioFile error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// MEETING HISTORY (V3)
// ============================================================

/**
 * Recupere l'historique des meetings d'un projet
 * @param projectId - ID du projet
 * @param options - Options de filtrage
 */
export async function getMeetingHistory(
  projectId: string,
  options?: {
    sourceType?: MeetingSourceType;
    limit?: number;
    offset?: number;
  }
): Promise<ServiceResult<Meeting[]>> {
  try {
    let query = supabase
      .schema('arpet')
      .from('meetings')
      .select('*')
      .eq('project_id', projectId)
      .order('meeting_date', { ascending: false });

    if (options?.sourceType) {
      query = query.eq('source_type', options.sourceType);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Parser les participants JSON
    const meetings: Meeting[] = (data || []).map(row => ({
      ...row,
      participants: row.participants ? (row.participants as MeetingParticipantEnriched[]) : null,
    }));

    return { data: meetings, error: null };
  } catch (error) {
    console.error('[MeetingService] getMeetingHistory error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Recupere un meeting par son ID
 */
export async function getMeetingById(meetingId: string): Promise<ServiceResult<Meeting>> {
  try {
    const { data, error } = await supabase
      .schema('arpet')
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (error) {
      throw error;
    }

    const meeting: Meeting = {
      ...data,
      participants: data.participants ? (data.participants as MeetingParticipantEnriched[]) : null,
    };

    return { data: meeting, error: null };
  } catch (error) {
    console.error('[MeetingService] getMeetingById error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// MEETING ITEMS (V3)
// ============================================================

/**
 * Recupere les items d'un meeting
 */
export async function getMeetingItems(meetingId: string): Promise<ServiceResult<MeetingItem[]>> {
  try {
    const { data, error } = await supabase
      .schema('arpet')
      .from('meeting_items')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('display_order', { ascending: true });

    if (error) {
      throw error;
    }

    // Assurer que topic_tags est toujours un array
    const items: MeetingItem[] = (data || []).map(row => ({
      ...row,
      topic_tags: row.topic_tags || [],
      related_documents: row.related_documents || [],
    }));

    return { data: items, error: null };
  } catch (error) {
    console.error('[MeetingService] getMeetingItems error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Met a jour un meeting item
 */
export async function updateMeetingItem(
  itemId: string,
  updates: Partial<Pick<MeetingItem, 'status' | 'responsible' | 'due_date' | 'location' | 'topic_tags' | 'related_documents'>>
): Promise<ServiceResult<MeetingItem>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Utilisateur non connect\u00e9');
    }

    // Si le statut change, mettre a jour les champs de tracking
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.status) {
      updateData.status_updated_at = new Date().toISOString();
      updateData.status_updated_by = session.user.id;
    }

    const { data, error } = await supabase
      .schema('arpet')
      .from('meeting_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const item: MeetingItem = {
      ...data,
      topic_tags: data.topic_tags || [],
      related_documents: data.related_documents || [],
    };

    return { data: item, error: null };
  } catch (error) {
    console.error('[MeetingService] updateMeetingItem error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Met a jour les participants d'un meeting (mapping speakers)
 */
export async function updateMeetingParticipants(
  meetingId: string,
  participants: MeetingParticipantEnriched[]
): Promise<ServiceResult<Meeting>> {
  try {
    const { data, error } = await supabase
      .schema('arpet')
      .from('meetings')
      .update({ participants })
      .eq('id', meetingId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const meeting: Meeting = {
      ...data,
      participants: data.participants as MeetingParticipantEnriched[],
    };

    return { data: meeting, error: null };
  } catch (error) {
    console.error('[MeetingService] updateMeetingParticipants error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// TRANSCRIPT SPEAKER PARSING
// ============================================================

/**
 * Speaker extrait d'un transcript Gladia
 */
export interface TranscriptSpeaker {
  /** ID numerique du speaker (0, 1, 2...) */
  speaker_id: number;
  /** Label original ("Speaker 0") */
  label: string;
  /** Nombre d'interventions */
  utterance_count: number;
  /** Premier extrait (~120 chars) pour identification */
  sample_text: string;
}

/**
 * Couleurs assignees aux speakers pour le transcript colorise
 */
export const SPEAKER_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
] as const;

/**
 * Parse un transcript pour extraire la liste des speakers uniques
 * Format attendu : "[Speaker X] texte..." ou "[Nom] texte..."
 */
export function parseTranscriptSpeakers(transcript: string): TranscriptSpeaker[] {
  if (!transcript) return [];

  const speakerMap = new Map<number, { count: number; firstText: string }>();
  const lines = transcript.split('\n');

  // Pattern : [Speaker X] ou [Intervenant X] suivi de texte
  const speakerRegex = /^\[(?:Speaker|Intervenant)\s+(\d+)\]\s*(.*)$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(speakerRegex);
    if (match) {
      const speakerId = parseInt(match[1], 10);
      const text = match[2].trim();

      if (!speakerMap.has(speakerId)) {
        speakerMap.set(speakerId, {
          count: 1,
          firstText: text.length > 120 ? text.slice(0, 120) + '...' : text,
        });
      } else {
        const existing = speakerMap.get(speakerId)!;
        existing.count++;
      }
    }
  }

  // Convertir en tableau trie par speaker_id
  const speakers: TranscriptSpeaker[] = Array.from(speakerMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([speakerId, info]) => ({
      speaker_id: speakerId,
      label: `Speaker ${speakerId}`,
      utterance_count: info.count,
      sample_text: info.firstText || '(aucun extrait)',
    }));

  return speakers;
}

/**
 * Remplace les labels [Speaker X] par les noms mappes dans le transcript
 * Retourne le transcript enrichi + un tableau de segments pour le rendu colorise
 */
export interface TranscriptSegment {
  speaker_id: number | null;
  speaker_name: string | null;
  text: string;
  color: string | null;
}

export function buildColorizedTranscript(
  transcript: string,
  participantMap: Map<number, string> // speaker_id -> nom mappe
): TranscriptSegment[] {
  if (!transcript) return [];

  const segments: TranscriptSegment[] = [];
  const lines = transcript.split('\n');
  const speakerRegex = /^\[(?:Speaker|Intervenant)\s+(\d+)\]\s*(.*)$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      segments.push({ speaker_id: null, speaker_name: null, text: '', color: null });
      continue;
    }

    const match = trimmed.match(speakerRegex);
    if (match) {
      const speakerId = parseInt(match[1], 10);
      const text = match[2].trim();
      const mappedName = participantMap.get(speakerId) || `Speaker ${speakerId}`;
      const color = SPEAKER_COLORS[speakerId % SPEAKER_COLORS.length];

      segments.push({
        speaker_id: speakerId,
        speaker_name: mappedName,
        text,
        color,
      });
    } else {
      // Ligne sans label de speaker (continuation ou annotation)
      segments.push({
        speaker_id: null,
        speaker_name: null,
        text: trimmed,
        color: null,
      });
    }
  }

  return segments;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Parse les participants de la reponse
 */
function parseParticipants(raw: unknown): MeetingParticipant[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (typeof item === 'object' && item !== null) {
        return {
          name: (item as Record<string, unknown>).name as string || 'Inconnu',
          role: (item as Record<string, unknown>).role as string | undefined,
        };
      }
      if (typeof item === 'string') {
        // Format "Nom (Role)" ou juste "Nom"
        const match = item.match(/^(.+?)\s*\((.+)\)$/);
        if (match) {
          return { name: match[1].trim(), role: match[2].trim() };
        }
        return { name: item };
      }
      return { name: String(item) };
    });
  }

  return [];
}

/**
 * Parse les items (decisions, actions, issues) de la reponse
 */
function parseItems(raw: unknown): MeetingItem[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((item, index) => {
      if (typeof item === 'object' && item !== null) {
        const i = item as Record<string, unknown>;
        return {
          id: (i.id as string) || `item-${index}`,
          item_type: (i.item_type as MeetingItemType) || 'info',
          subject: (i.subject as string) || '',
          content: (i.content as string) || '',
          context: (i.context as string) || undefined,
          lot_reference: (i.lot_reference as string) || null,
          responsible: (i.responsible as string) || null,
          due_date: (i.due_date as string) || null,
          status: (i.status as MeetingItemStatus) || 'open',
          location: (i.location as string) || undefined,
          topic_tags: (i.topic_tags as string[]) || [],
          related_documents: (i.related_documents as string[]) || undefined,
        };
      }
      return {
        id: `item-${index}`,
        item_type: 'info' as const,
        subject: String(item),
        content: String(item),
        lot_reference: null,
        responsible: null,
        due_date: null,
        status: 'open' as const,
        topic_tags: [],
      };
    });
  }

  return [];
}

/**
 * Genere un titre par defaut pour la reunion
 */
export function generateDefaultTitle(): string {
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

// ============================================================
// HELPERS POUR L'UI
// ============================================================

/**
 * Groupe les items par type
 */
export function groupItemsByType(items: MeetingItem[]): {
  decisions: MeetingItem[];
  actions: MeetingItem[];
  issues: MeetingItem[];
  infos: MeetingItem[];
} {
  return {
    decisions: items.filter(i => i.item_type === 'decision'),
    actions: items.filter(i => i.item_type === 'action'),
    issues: items.filter(i => i.item_type === 'issue'),
    infos: items.filter(i => i.item_type === 'info'),
  };
}

/**
 * Retourne l'icone pour un type d'item
 */
export function getItemTypeIcon(type: MeetingItemType): string {
  switch (type) {
    case 'decision': return '\u2705';
    case 'action': return '\uD83D\uDCCB';
    case 'issue': return '\u26A0\uFE0F';
    case 'info': return '\u2139\uFE0F';
    default: return '\uD83D\uDCCC';
  }
}

/**
 * Retourne le label pour un type d'item
 */
export function getItemTypeLabel(type: MeetingItemType): string {
  switch (type) {
    case 'decision': return 'D\u00e9cision';
    case 'action': return 'Action';
    case 'issue': return 'Probl\u00e8me';
    case 'info': return 'Information';
    default: return 'Item';
  }
}

/**
 * Retourne la couleur pour un type d'item
 */
export function getItemTypeColor(type: MeetingItemType): {
  bg: string;
  text: string;
  border: string;
} {
  switch (type) {
    case 'decision':
      return { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' };
    case 'action':
      return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' };
    case 'issue':
      return { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' };
    case 'info':
      return { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' };
    default:
      return { bg: 'bg-stone-50', text: 'text-stone-800', border: 'border-stone-200' };
  }
}

/**
 * Retourne l'icone pour un type de source
 */
export function getSourceTypeIcon(sourceType: MeetingSourceType): string {
  switch (sourceType) {
    case 'recording': return '\uD83C\uDFA4';
    case 'uploaded_audio': return '\uD83D\uDCC1';
    case 'visio_bot': return '\uD83D\uDCBB';
    case 'memo': return '\uD83D\uDDE3\uFE0F';
    case 'uploaded_cr': return '\uD83D\uDCC4';
    case 'manual': return '\u270D\uFE0F';
    default: return '\uD83D\uDCC4';
  }
}

/**
 * Retourne le label pour un type de source
 */
export function getSourceTypeLabel(sourceType: MeetingSourceType): string {
  switch (sourceType) {
    case 'recording': return 'Enregistrement';
    case 'uploaded_audio': return 'Audio import\u00e9';
    case 'visio_bot': return 'Visio (bot)';
    case 'memo': return 'M\u00e9mo vocal';
    case 'uploaded_cr': return 'CR import\u00e9';
    case 'manual': return 'Saisie manuelle';
    default: return 'Autre';
  }
}
