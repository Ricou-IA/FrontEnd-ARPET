/**
 * Meeting Service - Phase 2.2
 * Gestion des enregistrements de réunions et appel Edge Function process-audio
 */

import { supabase } from '../lib/supabase';
import type { 
  SourceMeeting, 
  ProcessAudioResponse, 
  MeetingPrepareData,
  MeetingActionItem,
  MeetingProcessingStatus
} from '../types';

// ============================================================
// CONSTANTES
// ============================================================

const SUPABASE_URL = 'https://odspcxgafcqxjzrarsqf.supabase.co';

// ============================================================
// TYPES LOCAUX
// ============================================================

interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

// ============================================================
// TRAITEMENT AUDIO (Edge Function)
// ============================================================

/**
 * Envoie l'audio à l'Edge Function process-audio pour traitement
 * @param audioBlob - Blob audio enregistré
 * @param prepareData - Données de préparation (titre, participants, agenda)
 * @param onStatusChange - Callback pour suivre la progression
 */
export async function processAudio(
  audioBlob: Blob,
  prepareData: MeetingPrepareData,
  onStatusChange?: (status: MeetingProcessingStatus) => void
): Promise<ServiceResult<ProcessAudioResponse>> {
  try {
    // Récupérer la session utilisateur
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Utilisateur non connecté');
    }

    onStatusChange?.('uploading');

    // Créer un FormData (format attendu par l'Edge Function)
    const formData = new FormData();
    
    // Créer un File à partir du Blob avec un nom
    const fileName = `meeting_${Date.now()}.webm`;
    const audioFile = new File([audioBlob], fileName, { 
      type: audioBlob.type || 'audio/webm' 
    });
    
    // Ajouter le fichier audio (l'Edge Function accepte 'audio' ou 'file')
    formData.append('audio', audioFile);
    formData.append('title', prepareData.title);
    
    if (prepareData.participants) {
      formData.append('participants', prepareData.participants);
    }
    if (prepareData.agenda) {
      formData.append('agenda', prepareData.agenda);
    }
    
    // Ajouter target_apps pour le RAG
    formData.append('target_apps', JSON.stringify(['arpet']));

    console.log('[MeetingService] Envoi FormData à process-audio...', {
      title: prepareData.title,
      fileName,
      audioSize: audioBlob.size,
      mimeType: audioBlob.type,
    });

    onStatusChange?.('transcribing');

    // Appeler l'Edge Function avec fetch directement (FormData)
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/process-audio`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData, // FormData, pas JSON !
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[MeetingService] Edge Function error:', errorData);
      onStatusChange?.('error');
      throw new Error(errorData.error || `Erreur ${response.status}`);
    }

    const data = await response.json();
    console.log('[MeetingService] process-audio response:', data);

    onStatusChange?.('analyzing');
    await sleep(300);
    onStatusChange?.('completed');

    // Parser la réponse - l'Edge Function retourne { success, meeting }
    const meeting = data.meeting || data;
    
    const result: ProcessAudioResponse = {
      success: true,
      meeting_id: meeting.id || '',
      transcript: meeting.transcript || '',
      summary: meeting.summary || '',
      action_items: parseActionItems(meeting.action_items),
      audio_url: meeting.audio_url || '',
      storage_path: meeting.audio_url || '',
    };

    return { data: result, error: null };
  } catch (error) {
    console.error('[MeetingService] processAudio error:', error);
    onStatusChange?.('error');
    return { data: null, error: error as Error };
  }
}

// ============================================================
// CRUD MEETINGS
// ============================================================

/**
 * Récupère une réunion par son ID
 */
export async function getMeetingById(id: string): Promise<ServiceResult<SourceMeeting>> {
  try {
    const { data, error } = await supabase
      .schema('sources')
      .from('meetings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[MeetingService] getMeetingById error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Récupère les réunions de l'utilisateur
 */
export async function getUserMeetings(limit = 20): Promise<ServiceResult<SourceMeeting[]>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Utilisateur non connecté');
    }

    const { data, error } = await supabase
      .schema('sources')
      .from('meetings')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('[MeetingService] getUserMeetings error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Supprime une réunion
 */
export async function deleteMeeting(id: string): Promise<ServiceResult<boolean>> {
  try {
    const { error } = await supabase
      .schema('sources')
      .from('meetings')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { data: true, error: null };
  } catch (error) {
    console.error('[MeetingService] deleteMeeting error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Parse les action_items de la réponse
 */
function parseActionItems(raw: unknown): MeetingActionItem[] {
  if (!raw) return [];
  
  // Si c'est un tableau de strings (format Edge Function actuel)
  if (Array.isArray(raw)) {
    return raw.map((item, index) => {
      // Si c'est déjà un objet structuré
      if (typeof item === 'object' && item !== null) {
        return {
          id: item.id || `action-${index}`,
          who: item.who || item.responsible || item.assignee || 'Non assigné',
          what: item.what || item.task || item.description || item.action || '',
          when: item.when || item.deadline || item.due_date || null,
          priority: item.priority || 'medium',
        };
      }
      
      // Si c'est une string "Action - Responsable"
      if (typeof item === 'string') {
        const parts = item.split(' - ');
        return {
          id: `action-${index}`,
          what: parts[0] || item,
          who: parts[1] || 'Non assigné',
          when: null,
          priority: 'medium' as const,
        };
      }
      
      return {
        id: `action-${index}`,
        what: String(item),
        who: 'Non assigné',
        when: null,
        priority: 'medium' as const,
      };
    });
  }

  // Si c'est un objet avec des clés
  if (typeof raw === 'object' && raw !== null) {
    const items = Object.values(raw as Record<string, unknown>);
    return items.map((item: unknown, index) => {
      const i = item as Record<string, unknown>;
      return {
        id: `action-${index}`,
        who: (i.who || i.responsible || i.assignee || 'Non assigné') as string,
        what: (i.what || i.task || i.description || i.action || '') as string,
        when: (i.when || i.deadline || i.due_date || null) as string | null,
        priority: (i.priority || 'medium') as 'high' | 'medium' | 'low',
      };
    });
  }

  return [];
}

/**
 * Utilitaire sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Formate la durée en mm:ss ou hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Génère un titre par défaut pour la réunion
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
  return `Réunion du ${date} à ${time}`;
}
