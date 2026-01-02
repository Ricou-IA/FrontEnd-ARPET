/**
 * Meeting Service - Phase 7
 * Version: 3.0.0 - Connexion à meeting-transcribe (nouveau backend)
 * Gestion des enregistrements de réunions avec extraction décisions/actions
 */

import { supabase } from '../lib/supabase';

// ============================================================
// CONSTANTES
// ============================================================

const SUPABASE_URL = 'https://odspcxgafcqxjzrarsqf.supabase.co';

// ============================================================
// TYPES
// ============================================================

interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Statut du traitement audio
 */
export type MeetingProcessingStatus = 
  | 'idle'
  | 'uploading'
  | 'transcribing'
  | 'analyzing'
  | 'completed'
  | 'error';

/**
 * Participant structuré (extrait par GPT)
 */
export interface MeetingParticipant {
  name: string;
  role?: string;
}

/**
 * Item extrait (décision, action, issue, info)
 */
export interface MeetingItem {
  id: string;
  item_type: 'decision' | 'action' | 'issue' | 'info';
  subject: string;
  content: string;
  context?: string;
  lot_reference: string | null;
  responsible: string | null;
  due_date: string | null;
  status: 'open' | 'in_progress' | 'done' | 'cancelled';
}

/**
 * Données de préparation de la réunion (étape 1)
 * v3.0.0: Ajout project_id et org_id
 */
export interface MeetingPrepareData {
  title: string;
  participants?: string;
  agenda?: string;
  project_id: string;
  org_id: string;
}

/**
 * Réponse de l'Edge Function meeting-transcribe
 * v3.0.0: Nouveaux champs items, participants structurés
 */
export interface ProcessAudioResponse {
  success: boolean;
  meeting_id: string;
  audio_url: string;
  transcript: string;
  
  // Données structurées extraites
  meeting: {
    meeting_date: string | null;
    meeting_title: string;
    participants: MeetingParticipant[];
    summary: string;
    decisions_count: number;
    actions_count: number;
    issues_count: number;
  };
  
  // Items extraits (décisions, actions, issues)
  items: MeetingItem[];
  
  // Erreur éventuelle
  error?: string;
}

/**
 * Labels de progression pour l'UI
 */
export const MEETING_PROCESSING_LABELS: Record<MeetingProcessingStatus, string> = {
  idle: 'En attente',
  uploading: 'Envoi de l\'audio...',
  transcribing: 'Transcription en cours...',
  analyzing: 'Analyse et extraction...',
  completed: 'Terminé !',
  error: 'Erreur',
};

// ============================================================
// TRAITEMENT AUDIO (Edge Function meeting-transcribe)
// ============================================================

/**
 * Envoie l'audio à l'Edge Function meeting-transcribe pour traitement
 * @param audioBlob - Blob audio enregistré
 * @param prepareData - Données de préparation (titre, participants, project_id, org_id)
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
    
    // Ajouter le fichier audio
    formData.append('audio', audioFile);
    formData.append('title', prepareData.title);
    
    // Ajouter project_id et org_id (requis pour Phase 7)
    formData.append('project_id', prepareData.project_id);
    formData.append('org_id', prepareData.org_id);
    
    if (prepareData.participants) {
      formData.append('participants', prepareData.participants);
    }
    if (prepareData.agenda) {
      formData.append('agenda', prepareData.agenda);
    }

    console.log('[MeetingService] Envoi FormData à meeting-transcribe...', {
      title: prepareData.title,
      fileName,
      audioSize: audioBlob.size,
      mimeType: audioBlob.type,
      project_id: prepareData.project_id,
      org_id: prepareData.org_id,
    });

    onStatusChange?.('transcribing');

    // Appeler l'Edge Function meeting-transcribe
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/meeting-transcribe`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[MeetingService] Edge Function error:', errorData);
      onStatusChange?.('error');
      throw new Error(errorData.error || `Erreur ${response.status}`);
    }

    const data = await response.json();
    console.log('[MeetingService] meeting-transcribe response:', data);

    onStatusChange?.('analyzing');
    await sleep(300);
    onStatusChange?.('completed');

    // Parser la réponse de meeting-transcribe
    const result: ProcessAudioResponse = {
      success: data.success ?? true,
      meeting_id: data.meeting_id || '',
      audio_url: data.audio_url || '',
      transcript: data.transcript || '',
      
      meeting: {
        meeting_date: data.meeting?.meeting_date || null,
        meeting_title: data.meeting?.meeting_title || prepareData.title,
        participants: parseParticipants(data.meeting?.participants),
        summary: data.meeting?.summary || '',
        decisions_count: data.meeting?.decisions_count || 0,
        actions_count: data.meeting?.actions_count || 0,
        issues_count: data.meeting?.issues_count || 0,
      },
      
      items: parseItems(data.items),
      
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
// HELPERS
// ============================================================

/**
 * Parse les participants de la réponse
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
        // Format "Nom (Rôle)" ou juste "Nom"
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
 * Parse les items (décisions, actions, issues) de la réponse
 */
function parseItems(raw: unknown): MeetingItem[] {
  if (!raw) return [];
  
  if (Array.isArray(raw)) {
    return raw.map((item, index) => {
      if (typeof item === 'object' && item !== null) {
        const i = item as Record<string, unknown>;
        return {
          id: (i.id as string) || `item-${index}`,
          item_type: (i.item_type as MeetingItem['item_type']) || 'info',
          subject: (i.subject as string) || '',
          content: (i.content as string) || '',
          context: (i.context as string) || undefined,
          lot_reference: (i.lot_reference as string) || null,
          responsible: (i.responsible as string) || null,
          due_date: (i.due_date as string) || null,
          status: (i.status as MeetingItem['status']) || 'open',
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
 * Retourne l'icône pour un type d'item
 */
export function getItemTypeIcon(type: MeetingItem['item_type']): string {
  switch (type) {
    case 'decision': return '✅';
    case 'action': return '📋';
    case 'issue': return '⚠️';
    case 'info': return 'ℹ️';
    default: return '📌';
  }
}

/**
 * Retourne le label pour un type d'item
 */
export function getItemTypeLabel(type: MeetingItem['item_type']): string {
  switch (type) {
    case 'decision': return 'Décision';
    case 'action': return 'Action';
    case 'issue': return 'Problème';
    case 'info': return 'Information';
    default: return 'Item';
  }
}

/**
 * Retourne la couleur pour un type d'item
 */
export function getItemTypeColor(type: MeetingItem['item_type']): {
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
