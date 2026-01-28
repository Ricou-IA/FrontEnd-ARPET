// ============================================================
// Document Categories Service
// Gestion des catégories documentaires
// ============================================================

import { supabase } from '@/lib/supabase';
import type { DocumentLayer, DocumentCategoryConfig } from '@/types';
import { getCurrentProfile, type ServiceResult } from './document-auth.helper';

// ============================================================
// CATÉGORIES DOCUMENTAIRES
// ============================================================

/**
 * Récupère les catégories de documents depuis config.document_categories
 * Filtrées par app_id et layer
 */
export async function getDocumentCategories(
  layer?: DocumentLayer
): Promise<ServiceResult<DocumentCategoryConfig[]>> {
  try {
    const profile = await getCurrentProfile();
    const appId = profile.app_id || 'arpet';

    // v1.6.2: Suppression du filtre is_active (colonne inexistante)
    const { data, error } = await supabase
      .schema('config')
      .from('document_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    // Filtrer côté client car Supabase ne supporte pas bien les filtres sur arrays
    let filtered = (data || []).filter(cat => {
      // Vérifier target_apps
      const appsMatch = cat.target_apps?.includes('all') || cat.target_apps?.includes(appId);
      if (!appsMatch) return false;

      // Vérifier target_layers si un layer est spécifié
      if (layer) {
        const layersMatch = cat.target_layers?.includes(layer);
        if (!layersMatch) return false;
      }

      return true;
    });

    // Tri secondaire par label côté client
    filtered.sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.label.localeCompare(b.label);
    });

    return { data: filtered, error: null };
  } catch (error) {
    console.error('getDocumentCategories error:', error);
    return { data: null, error: error as Error };
  }
}
