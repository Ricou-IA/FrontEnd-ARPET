// ============================================================
// ARPET - Documents Service (Supabase)
// Version: 1.0.0 - sources.files
// Date: 2025-12-18
// ============================================================

import { supabase } from '@/lib/supabase';
import type { 
  SourceFile, 
  DocumentLayer, 
  DocumentCategory,
  PromotionStatus 
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
// LECTURE - GET FILES
// ============================================================

/**
 * Récupère les fichiers par couche documentaire
 */
export async function getFilesByLayer(
  layer: DocumentLayer,
  options?: {
    projectId?: string;
    category?: DocumentCategory;
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
    switch (layer) {
      case 'app':
        // Documents Métier : accessibles par app_id
        query = query.eq('app_id', profile.app_id);
        break;
      case 'org':
        // Documents Orga : accessibles par org_id
        query = query.eq('org_id', profile.org_id);
        break;
      case 'project':
        // Documents Équipe : accessibles par org_id + project_id optionnel
        query = query.eq('org_id', profile.org_id);
        if (options?.projectId) {
          query = query.eq('project_id', options.projectId);
        }
        break;
      case 'user':
        // Documents Perso : uniquement ceux de l'utilisateur
        query = query.eq('created_by', profile.id);
        break;
    }

    // Filtre catégorie optionnel
    if (options?.category) {
      query = query.contains('metadata', { category: options.category });
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
// CRÉATION - UPLOAD FILE
// ============================================================

interface UploadFileInput {
  file: File;
  category?: DocumentCategory;
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
    const { file, category, projectId, description } = input;

    // Générer un chemin unique
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${profile.org_id}/${profile.id}/${timestamp}_${safeName}`;

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
      org_id: profile.org_id,
      project_id: projectId || null,
      created_by: profile.id,
      app_id: profile.app_id,
      storage_bucket: 'user-workspace',
      storage_path: storagePath,
      ingestion_level: 'user',
      processing_status: 'pending',
      promotion_status: 'draft' as PromotionStatus,
      metadata: {
        category: category || 'Autre',
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
 * Compte les fichiers par couche
 */
export async function getFilesCountByLayer(): Promise<ServiceResult<Record<DocumentLayer, number>>> {
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

      switch (layer) {
        case 'app':
          query = query.eq('app_id', profile.app_id);
          break;
        case 'org':
          query = query.eq('org_id', profile.org_id);
          break;
        case 'project':
          query = query.eq('org_id', profile.org_id);
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
 */
export async function getPendingPromotionsCount(): Promise<ServiceResult<number>> {
  try {
    const profile = await getCurrentProfile();

    const { count, error } = await supabase
      .schema('sources')
      .from('files')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', profile.org_id)
      .eq('promotion_status', 'pending');

    if (error) throw error;

    return { data: count || 0, error: null };
  } catch (error) {
    console.error('getPendingPromotionsCount error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// MOCK DATA (pour tests)
// ============================================================

/**
 * Génère des fichiers mockés pour la couche user (Perso)
 */
export function getMockUserFiles(): SourceFile[] {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();

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
      metadata: { category: 'CCTP', description: 'CCTP Gros Œuvre mis à jour' },
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
      metadata: { category: 'Planning' },
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
      metadata: { category: 'Note' },
      created_at: lastWeek,
      updated_at: yesterday,
    },
  ];
}
