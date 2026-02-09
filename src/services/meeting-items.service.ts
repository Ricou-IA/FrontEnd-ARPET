/**
 * Meeting Items Service - Phase 6/8
 * Version: 1.0.0
 * Requetes filtrees sur arpet.meeting_items cross-meetings
 * Separe de meeting.service.ts (qui gere les operations single-meeting)
 */

import { supabase } from '../lib/supabase';
import type {
  MeetingItem,
  MeetingItemType,
  MeetingItemStatus,
} from '../types/meeting.types';

// ============================================================
// TYPES
// ============================================================

interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Filtres pour les requetes cross-meetings sur meeting_items
 */
export interface MeetingItemFilters {
  /** Filtrer par type(s) d'item */
  item_type?: MeetingItemType | MeetingItemType[];
  /** Filtrer par statut(s) */
  status?: MeetingItemStatus | MeetingItemStatus[];
  /** Filtrer par lot */
  lot_reference?: string;
  /** Filtrer par responsable */
  responsible?: string;
  /** Ne retourner que les items en retard */
  overdue_only?: boolean;
  /** Recherche texte sur subject + content */
  search?: string;
}

/**
 * Statistiques agregees des items d'un projet
 */
export interface MeetingItemsStats {
  total: number;
  by_type: Record<MeetingItemType, number>;
  by_status: Record<MeetingItemStatus, number>;
  overdue_count: number;
}

/**
 * Item enrichi avec le contexte de la reunion d'origine
 */
export interface MeetingItemWithContext extends MeetingItem {
  /** Titre de la reunion d'origine */
  meeting_title: string | null;
  /** Date de la reunion d'origine */
  meeting_date: string;
}

// ============================================================
// HELPERS
// ============================================================

const ITEM_TYPES: MeetingItemType[] = ['decision', 'action', 'issue', 'info'];
const ITEM_STATUSES: MeetingItemStatus[] = ['open', 'in_progress', 'done', 'cancelled'];

/**
 * Determine si un item est en retard
 */
export function isItemOverdue(item: { due_date: string | null; status: MeetingItemStatus }): boolean {
  if (!item.due_date) return false;
  if (item.status === 'done' || item.status === 'cancelled') return false;
  const today = new Date().toISOString().split('T')[0];
  return item.due_date < today;
}

/**
 * Transforme la reponse Supabase (avec join meetings) en MeetingItemWithContext
 */
function mapToItemWithContext(row: Record<string, unknown>): MeetingItemWithContext {
  // Le join Supabase retourne meetings comme un objet imbrique
  const meetingData = row.meetings as Record<string, unknown> | null;

  return {
    id: row.id as string,
    meeting_id: row.meeting_id as string,
    item_type: row.item_type as MeetingItemType,
    subject: row.subject as string,
    content: row.content as string,
    context: row.context as string | undefined,
    lot_reference: row.lot_reference as string | null,
    responsible: row.responsible as string | null,
    due_date: row.due_date as string | null,
    status: row.status as MeetingItemStatus,
    location: row.location as string | undefined,
    topic_tags: (row.topic_tags as string[]) || [],
    related_documents: (row.related_documents as string[]) || undefined,
    display_order: row.display_order as number | undefined,
    status_updated_at: row.status_updated_at as string | undefined,
    status_updated_by: row.status_updated_by as string | undefined,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
    // Contexte reunion
    meeting_title: meetingData?.meeting_title as string | null ?? null,
    meeting_date: meetingData?.meeting_date as string ?? '',
  };
}

// ============================================================
// FONCTIONS PRINCIPALES
// ============================================================

/**
 * Recupere tous les items de toutes les reunions d'un projet, avec filtres optionnels.
 * Join sur meetings pour inclure meeting_title et meeting_date.
 */
export async function getProjectMeetingItems(
  projectId: string,
  filters?: MeetingItemFilters
): Promise<ServiceResult<MeetingItemWithContext[]>> {
  try {
    // Select avec join sur meetings pour le contexte
    let query = supabase
      .schema('arpet')
      .from('meeting_items')
      .select('*, meetings!inner(meeting_title, meeting_date, project_id)')
      .eq('meetings.project_id', projectId)
      .order('created_at', { ascending: false });

    // Appliquer les filtres
    if (filters) {
      // Filtre type
      if (filters.item_type) {
        if (Array.isArray(filters.item_type)) {
          query = query.in('item_type', filters.item_type);
        } else {
          query = query.eq('item_type', filters.item_type);
        }
      }

      // Filtre statut
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      // Filtre lot
      if (filters.lot_reference) {
        query = query.eq('lot_reference', filters.lot_reference);
      }

      // Filtre responsable
      if (filters.responsible) {
        query = query.eq('responsible', filters.responsible);
      }

      // Filtre retard : due_date passe ET statut ouvert
      if (filters.overdue_only) {
        const today = new Date().toISOString().split('T')[0];
        query = query
          .lt('due_date', today)
          .in('status', ['open', 'in_progress']);
      }

      // Recherche texte (ilike sur subject)
      if (filters.search) {
        query = query.ilike('subject', `%${filters.search}%`);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const items = (data || []).map((row) =>
      mapToItemWithContext(row as Record<string, unknown>)
    );

    return { data: items, error: null };
  } catch (error) {
    console.error('[MeetingItemsService] getProjectMeetingItems error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Calcule les statistiques agregees des items d'un projet.
 * Fetch leger (colonnes minimales) + agregation JS.
 */
export async function getItemsStats(
  projectId: string
): Promise<ServiceResult<MeetingItemsStats>> {
  try {
    const { data, error } = await supabase
      .schema('arpet')
      .from('meeting_items')
      .select('item_type, status, due_date, meetings!inner(project_id)')
      .eq('meetings.project_id', projectId);

    if (error) {
      throw error;
    }

    const rows = data || [];
    const today = new Date().toISOString().split('T')[0];

    // Initialiser les compteurs
    const by_type: Record<MeetingItemType, number> = {
      decision: 0, action: 0, issue: 0, info: 0,
    };
    const by_status: Record<MeetingItemStatus, number> = {
      open: 0, in_progress: 0, done: 0, cancelled: 0,
    };
    let overdue_count = 0;

    for (const row of rows) {
      const type = row.item_type as MeetingItemType;
      const status = row.status as MeetingItemStatus;
      const due_date = row.due_date as string | null;

      if (ITEM_TYPES.includes(type)) by_type[type]++;
      if (ITEM_STATUSES.includes(status)) by_status[status]++;

      // Retard
      if (due_date && due_date < today && (status === 'open' || status === 'in_progress')) {
        overdue_count++;
      }
    }

    const stats: MeetingItemsStats = {
      total: rows.length,
      by_type,
      by_status,
      overdue_count,
    };

    return { data: stats, error: null };
  } catch (error) {
    console.error('[MeetingItemsService] getItemsStats error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Recupere les actions en retard d'un projet.
 * Raccourci vers getProjectMeetingItems avec filtre overdue.
 */
export async function getOverdueActions(
  projectId: string
): Promise<ServiceResult<MeetingItemWithContext[]>> {
  return getProjectMeetingItems(projectId, { overdue_only: true });
}
