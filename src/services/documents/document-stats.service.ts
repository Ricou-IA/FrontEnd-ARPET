// ============================================================
// Document Stats Service
// Comptages et statistiques sur les documents
// ============================================================

import { supabase } from '@/lib/supabase';
import type { DocumentLayer } from '@/types';
import { getCurrentProfile, type ServiceResult } from './document-auth.helper';

// ============================================================
// COMPTAGES (via vue files_with_permissions)
// ============================================================

/**
 * Compte les fichiers par couche (avec filtre projet optionnel)
 * Note: Si app_id ou org_id est null (superadmin), pas de filtre appliqué
 */
export async function getFilesCountByLayer(
  projectId?: string
): Promise<ServiceResult<Record<DocumentLayer, number>>> {
  try {
    const profile = await getCurrentProfile();

    const counts: Record<DocumentLayer, number> = {
      app: 0,
      org: 0,
      project: 0,
      user: 0,
    };

    // Requête pour chaque layer
    const layers: DocumentLayer[] = ['app', 'org', 'project', 'user'];

    for (const layer of layers) {
      // v1.6.0: Utiliser la vue avec permissions
      let query = supabase
        .schema('sources')
        .from('files_with_permissions')
        .select('id', { count: 'exact', head: true })
        .eq('layer', layer);

      // Filtres selon la couche
      // Note: Si la valeur est null/undefined, on ne filtre pas (superadmin voit tout)
      switch (layer) {
        case 'app':
          if (profile.app_id) {
            query = query.eq('app_id', profile.app_id);
          }
          break;
        case 'org':
          if (profile.org_id) {
            query = query.eq('org_id', profile.org_id);
          }
          break;
        case 'project':
          if (profile.org_id) {
            query = query.eq('org_id', profile.org_id);
          }
          // Si un projet est sélectionné, filtrer par ce projet
          if (projectId) {
            query = query.eq('project_id', projectId);
          }
          break;
        case 'user':
          query = query.eq('created_by', profile.id);
          break;
      }

      const { count } = await query;
      counts[layer] = count || 0;
    }

    return { data: counts, error: null };
  } catch (error) {
    console.error('getFilesCountByLayer error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Compte les demandes de promotion en attente (pour Team Leader)
 * Note: Si org_id est null (superadmin), compte toutes les demandes
 */
export async function getPendingPromotionsCount(): Promise<ServiceResult<number>> {
  try {
    const profile = await getCurrentProfile();

    // v1.6.0: Utiliser la vue avec permissions
    let query = supabase
      .schema('sources')
      .from('files_with_permissions')
      .select('id', { count: 'exact', head: true })
      .eq('promotion_status', 'pending');

    // Filtrer par org_id seulement si défini
    if (profile.org_id) {
      query = query.eq('org_id', profile.org_id);
    }

    const { count, error } = await query;

    if (error) throw error;

    return { data: count || 0, error: null };
  } catch (error) {
    console.error('getPendingPromotionsCount error:', error);
    return { data: null, error: error as Error };
  }
}
