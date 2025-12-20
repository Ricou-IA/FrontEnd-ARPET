// ============================================================
// ARPET - Documents Service (Supabase)
// Version: 1.5.0 - Fix superadmin access (null app_id/org_id)
// Date: 2025-12-20
// ============================================================

import { supabase } from '@/lib/supabase';
import type { 
  SourceFile, 
  DocumentLayer, 
  PromotionStatus,
  Project,
  DocumentCategoryConfig
} from '@/types';

// ============================================================
// TYPES DE RETOUR
// ============================================================

interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

// ============================================================
// HELPER: Récupérer le profil utilisateur courant
// ============================================================

async function getCurrentProfile() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const { data: profile, error: profileError } = await supabase
    .schema('core')
    .from('profiles')
    .select('id, app_id, org_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Profile not found');
  }

  return profile;
}

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

    const query = supabase
      .schema('config')
      .from('document_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    // Filtrer côté client car Supabase ne supporte pas bien les filtres sur arrays
    const filtered = (data || []).filter(cat => {
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

    return { data: filtered, error: null };
  } catch (error) {
    console.error('getDocumentCategories error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// LECTURE - GET FILES
// ============================================================

/**
 * Récupère les fichiers par couche documentaire
 * Note: Si app_id ou org_id est null (superadmin), pas de filtre appliqué
 */
export async function getFilesByLayer(
  layer: DocumentLayer,
  options?: {
    projectId?: string;
    categoryId?: string; // UUID de la catégorie
    limit?: number;
  }
): Promise<ServiceResult<SourceFile[]>> {
  try {
    const profile = await getCurrentProfile();

    let query = supabase
      .schema('sources')
      .from('files')
      .select('*')
      .eq('layer', layer)
      .order('created_at', { ascending: false });

    // Filtres selon la couche
    // Note: Si la valeur est null/undefined, on ne filtre pas (superadmin voit tout)
    switch (layer) {
      case 'app':
        // Documents Métier : accessibles par app_id
        if (profile.app_id) {
          query = query.eq('app_id', profile.app_id);
        }
        break;
      case 'org':
        // Documents Orga : accessibles par org_id
        if (profile.org_id) {
          query = query.eq('org_id', profile.org_id);
        }
        break;
      case 'project':
        // Documents Équipe : accessibles par org_id + project_id optionnel
        if (profile.org_id) {
          query = query.eq('org_id', profile.org_id);
        }
        if (options?.projectId) {
          query = query.eq('project_id', options.projectId);
        }
        break;
      case 'user':
        // Documents Perso : uniquement ceux de l'utilisateur
        query = query.eq('created_by', profile.id);
        break;
    }

    // Filtre catégorie optionnel (par UUID)
    if (options?.categoryId) {
      query = query.contains('metadata', { category: options.categoryId });
    }

    // Limite optionnelle
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('getFilesByLayer error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Récupère un fichier par son ID
 */
export async function getFileById(id: string): Promise<ServiceResult<SourceFile>> {
  try {
    const { data, error } = await supabase
      .schema('sources')
      .from('files')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('getFileById error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Récupère l'URL de téléchargement d'un fichier
 */
export async function getFileDownloadUrl(
  bucket: string,
  path: string
): Promise<ServiceResult<string>> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600); // 1 heure

    if (error) throw error;

    return { data: data.signedUrl, error: null };
  } catch (error) {
    console.error('getFileDownloadUrl error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// RÉCUPÉRATION FICHIER DEPUIS UN CHUNK RAG
// ============================================================

/**
 * Récupère les infos d'un fichier source à partir d'un document_id (chunk dans rag.documents)
 */
export async function getSourceFileByChunkId(
  chunkId: string | number
): Promise<ServiceResult<SourceFile>> {
  try {
    // 1. Récupérer le source_file_id depuis le chunk
    const { data: chunk, error: chunkError } = await supabase
      .schema('rag')
      .from('documents')
      .select('source_file_id')
      .eq('id', chunkId)
      .single();

    if (chunkError || !chunk?.source_file_id) {
      console.log('Chunk not found or no source_file_id:', chunkId);
      return { data: null, error: new Error('Source file not found') };
    }

    // 2. Récupérer le fichier source
    const { data: file, error: fileError } = await supabase
      .schema('sources')
      .from('files')
      .select('*')
      .eq('id', chunk.source_file_id)
      .single();

    if (fileError || !file) {
      console.log('File not found:', chunk.source_file_id);
      return { data: null, error: new Error('File not found') };
    }

    return { data: file, error: null };
  } catch (error) {
    console.error('getSourceFileByChunkId error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Récupère les infos d'un fichier source directement par son ID (sources.files)
 */
export async function getSourceFileById(
  fileId: string
): Promise<ServiceResult<SourceFile>> {
  try {
    const { data: file, error } = await supabase
      .schema('sources')
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error || !file) {
      return { data: null, error: new Error('File not found') };
    }

    return { data: file, error: null };
  } catch (error) {
    console.error('getSourceFileById error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// CRÉATION - UPLOAD FILE
// ============================================================

interface UploadFileInput {
  file: File;
  categoryId?: string; // UUID de la catégorie
  projectId?: string;
  description?: string;
}

/**
 * Upload un fichier dans le layer 'user' (Perso)
 */
export async function uploadFile(
  input: UploadFileInput
): Promise<ServiceResult<SourceFile>> {
  try {
    const profile = await getCurrentProfile();
    const { file, categoryId, projectId, description } = input;

    // Générer un chemin unique
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${profile.org_id || 'no-org'}/${profile.id}/${timestamp}_${safeName}`;

    // 1. Upload vers Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('user-workspace')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // 2. Créer l'entrée dans sources.files
    const fileRecord = {
      original_filename: file.name,
      mime_type: file.type,
      file_size: file.size,
      layer: 'user' as DocumentLayer,
      org_id: profile.org_id || null,
      project_id: projectId || null,
      created_by: profile.id,
      app_id: profile.app_id || null,
      storage_bucket: 'user-workspace',
      storage_path: storagePath,
      ingestion_level: 'user',
      processing_status: 'pending',
      promotion_status: 'draft' as PromotionStatus,
      metadata: {
        category: categoryId || null,
        description: description || null,
      },
    };

    const { data, error } = await supabase
      .schema('sources')
      .from('files')
      .insert(fileRecord)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ File uploaded:', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('uploadFile error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// MISE À JOUR - UPDATE FILE
// ============================================================

interface UpdateFileInput {
  original_filename?: string;
  categoryId?: string; // UUID de la catégorie
  description?: string;
  project_id?: string | null;
}

/**
 * Met à jour un fichier (uniquement layer 'user' et créé par l'utilisateur)
 */
export async function updateFile(
  id: string,
  input: UpdateFileInput
): Promise<ServiceResult<SourceFile>> {
  try {
    const profile = await getCurrentProfile();

    // Construire l'objet de mise à jour
    const updateData: Record<string, unknown> = {};

    if (input.original_filename !== undefined) {
      updateData.original_filename = input.original_filename;
    }

    if (input.project_id !== undefined) {
      updateData.project_id = input.project_id;
    }

    // Mise à jour des métadonnées (category = UUID, description)
    if (input.categoryId !== undefined || input.description !== undefined) {
      // Récupérer les métadonnées actuelles
      const { data: currentFile } = await supabase
        .schema('sources')
        .from('files')
        .select('metadata')
        .eq('id', id)
        .single();

      const currentMetadata = currentFile?.metadata || {};
      
      updateData.metadata = {
        ...currentMetadata,
        ...(input.categoryId !== undefined && { category: input.categoryId }),
        ...(input.description !== undefined && { description: input.description }),
      };
    }

    // Ajouter updated_at
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .schema('sources')
      .from('files')
      .update(updateData)
      .eq('id', id)
      .eq('created_by', profile.id)
      .eq('layer', 'user')
      .select()
      .single();

    if (error) throw error;

    console.log('✅ File updated:', id);
    return { data, error: null };
  } catch (error) {
    console.error('updateFile error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// SUPPRESSION
// ============================================================

/**
 * Supprime un fichier (uniquement layer 'user' et créé par l'utilisateur)
 */
export async function deleteFile(id: string): Promise<ServiceResult<boolean>> {
  try {
    const profile = await getCurrentProfile();

    // Vérifier que le fichier appartient à l'utilisateur
    const { data: file, error: fetchError } = await supabase
      .schema('sources')
      .from('files')
      .select('*')
      .eq('id', id)
      .eq('created_by', profile.id)
      .eq('layer', 'user')
      .single();

    if (fetchError || !file) {
      throw new Error('File not found or access denied');
    }

    // Supprimer du storage si le path existe
    if (file.storage_path) {
      await supabase.storage
        .from(file.storage_bucket)
        .remove([file.storage_path]);
    }

    // Supprimer l'entrée dans la base
    const { error } = await supabase
      .schema('sources')
      .from('files')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('✅ File deleted:', id);
    return { data: true, error: null };
  } catch (error) {
    console.error('deleteFile error:', error);
    return { data: null, error: error as Error };
  }
}

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

    console.log('✅ Promotion requested:', id);
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

    console.log('✅ Promotion approved:', id);
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

    console.log('✅ Promotion rejected:', id);
    return { data, error: null };
  } catch (error) {
    console.error('rejectPromotion error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// COMPTAGES
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
      let query = supabase
        .schema('sources')
        .from('files')
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

    let query = supabase
      .schema('sources')
      .from('files')
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
      .select('id, name, org_id, description, status, created_at, updated_at')
      .eq('status', 'active')
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

// ============================================================
// MOCK DATA (pour tests)
// ============================================================

/**
 * Génère des fichiers mockés pour la couche user (Perso)
 * Note: category contient maintenant un UUID
 */
export function getMockUserFiles(): SourceFile[] {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();

  // UUID fictifs pour les catégories mock
  const MOCK_CAT_PIECES_MARCHE = 'bdf87560-6e1d-4bf9-84e3-620e94ee8b83';
  const MOCK_CAT_SUIVI = 'mock-cat-suivi';
  const MOCK_CAT_AUTRES = 'mock-cat-autres';

  return [
    {
      id: 'mock-1',
      original_filename: 'CCTP_Lot_GO_v2.pdf',
      mime_type: 'application/pdf',
      file_size: 2458000,
      chunk_count: 45,
      content_hash: null,
      layer: 'user',
      org_id: 'mock-org',
      project_id: null,
      created_by: 'mock-user',
      app_id: 'arpet',
      storage_bucket: 'user-workspace',
      storage_path: 'mock/cctp.pdf',
      ingestion_level: 'user',
      processing_status: 'completed',
      processing_error: null,
      processed_at: yesterday,
      promotion_status: 'draft',
      promotion_requested_at: null,
      promotion_requested_by: null,
      promotion_reviewed_at: null,
      promotion_reviewed_by: null,
      promotion_comment: null,
      metadata: { category: MOCK_CAT_PIECES_MARCHE, description: 'CCTP Gros Œuvre mis à jour' },
      created_at: yesterday,
      updated_at: yesterday,
    },
    {
      id: 'mock-2',
      original_filename: 'Planning_S52.xlsx',
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      file_size: 156000,
      chunk_count: 0,
      content_hash: null,
      layer: 'user',
      org_id: 'mock-org',
      project_id: null,
      created_by: 'mock-user',
      app_id: 'arpet',
      storage_bucket: 'user-workspace',
      storage_path: 'mock/planning.xlsx',
      ingestion_level: 'user',
      processing_status: 'completed',
      processing_error: null,
      processed_at: now,
      promotion_status: 'pending',
      promotion_requested_at: now,
      promotion_requested_by: 'mock-user',
      promotion_reviewed_at: null,
      promotion_reviewed_by: null,
      promotion_comment: 'Planning prévisionnel pour la semaine 52',
      metadata: { category: MOCK_CAT_SUIVI },
      created_at: now,
      updated_at: now,
    },
    {
      id: 'mock-3',
      original_filename: 'Note_technique_fondations.pdf',
      mime_type: 'application/pdf',
      file_size: 890000,
      chunk_count: 12,
      content_hash: null,
      layer: 'user',
      org_id: 'mock-org',
      project_id: null,
      created_by: 'mock-user',
      app_id: 'arpet',
      storage_bucket: 'user-workspace',
      storage_path: 'mock/note.pdf',
      ingestion_level: 'user',
      processing_status: 'completed',
      processing_error: null,
      processed_at: lastWeek,
      promotion_status: 'rejected',
      promotion_requested_at: lastWeek,
      promotion_requested_by: 'mock-user',
      promotion_reviewed_at: yesterday,
      promotion_reviewed_by: 'mock-tl',
      promotion_comment: 'Document obsolète, version plus récente disponible',
      metadata: { category: MOCK_CAT_AUTRES },
      created_at: lastWeek,
      updated_at: yesterday,
    },
  ];
}
