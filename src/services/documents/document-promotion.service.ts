// ============================================================
// Document Promotion Service
// Gestion des demandes de promotion de documents
// ============================================================

import { supabase } from '@/lib/supabase';
import type { SourceFile } from '@/types';
import { getCurrentProfile, type ServiceResult } from './document-auth.helper';

// ============================================================
// PROMOTION
// ============================================================

/**
 * Demander la promotion d'un fichier (user → project)
 */
export async function requestPromotion(
  id: string,
  comment?: string
): Promise<ServiceResult<SourceFile>> {
  try {
    const profile = await getCurrentProfile();

    const { data, error } = await supabase
      .schema('sources')
      .from('files')
      .update({
        promotion_status: 'pending',
        promotion_requested_at: new Date().toISOString(),
        promotion_requested_by: profile.id,
        promotion_comment: comment || null,
      })
      .eq('id', id)
      .eq('created_by', profile.id)
      .eq('layer', 'user')
      .select()
      .single();

    if (error) throw error;

    console.log('Promotion requested:', id);
    return { data, error: null };
  } catch (error) {
    console.error('requestPromotion error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Approuver une demande de promotion (Team Leader)
 */
export async function approvePromotion(
  id: string
): Promise<ServiceResult<SourceFile>> {
  try {
    const profile = await getCurrentProfile();

    const { data, error } = await supabase
      .schema('sources')
      .from('files')
      .update({
        promotion_status: 'approved',
        promotion_reviewed_at: new Date().toISOString(),
        promotion_reviewed_by: profile.id,
        layer: 'project', // Promu vers Équipe
      })
      .eq('id', id)
      .eq('promotion_status', 'pending')
      .select()
      .single();

    if (error) throw error;

    console.log('Promotion approved:', id);
    return { data, error: null };
  } catch (error) {
    console.error('approvePromotion error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Refuser une demande de promotion (Team Leader)
 */
export async function rejectPromotion(
  id: string,
  reason?: string
): Promise<ServiceResult<SourceFile>> {
  try {
    const profile = await getCurrentProfile();

    const { data, error } = await supabase
      .schema('sources')
      .from('files')
      .update({
        promotion_status: 'rejected',
        promotion_reviewed_at: new Date().toISOString(),
        promotion_reviewed_by: profile.id,
        promotion_comment: reason || null,
      })
      .eq('id', id)
      .eq('promotion_status', 'pending')
      .select()
      .single();

    if (error) throw error;

    console.log('Promotion rejected:', id);
    return { data, error: null };
  } catch (error) {
    console.error('rejectPromotion error:', error);
    return { data: null, error: error as Error };
  }
}
