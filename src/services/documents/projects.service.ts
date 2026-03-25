// ============================================================
// Projects Service
// Gestion des projets utilisateur
// ============================================================

import { supabase } from '@/lib/supabase';
import type { Project } from '@/types';
import { getCurrentProfile, type ServiceResult } from './document-auth.helper';

// ============================================================
// PROJETS UTILISATEUR
// ============================================================

/**
 * Récupère les projets accessibles à l'utilisateur
 * Note: Si org_id est null (superadmin), retourne tous les projets
 */
export async function getUserProjects(): Promise<ServiceResult<Project[]>> {
  try {
    const profile = await getCurrentProfile();

    let query = supabase
      .schema('core')
      .from('projects')
      .select('id, name, org_id, description, status, created_at, updated_at, organization:organizations!inner(app_id)')
      .eq('status', 'active')
      .eq('organization.app_id', 'arpet')
      .order('name', { ascending: true });

    // Filtrer par org_id seulement si défini
    if (profile.org_id) {
      query = query.eq('org_id', profile.org_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('getUserProjects error:', error);
    return { data: null, error: error as Error };
  }
}
