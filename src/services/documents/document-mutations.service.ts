// ============================================================
// Document Mutations Service
// Opérations d'écriture sur les documents (upload, update, delete)
// ============================================================

import { supabase } from '@/lib/supabase';
import type { SourceFile, DocumentLayer, PromotionStatus } from '@/types';
import { getCurrentProfile, type ServiceResult } from './document-auth.helper';

// ============================================================
// TYPES
// ============================================================

export interface UploadFileInput {
  file: File;
  categoryId?: string; // UUID de la catégorie
  projectId?: string;
  description?: string;
}

export interface UpdateFileInput {
  original_filename?: string;
  categoryId?: string; // UUID de la catégorie
  description?: string;
  project_id?: string | null;
}

// ============================================================
// CRÉATION - UPLOAD FILE (écriture sur table files)
// ============================================================

/**
 * Upload un fichier dans le layer 'user' (Perso)
 * Note: INSERT sur la table files (pas la vue)
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

    // 2. Créer l'entrée dans sources.files (table, pas vue)
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

    // Ajouter les permissions par défaut pour un document user
    const dataWithPermissions = {
      ...data,
      can_edit: true,
      can_delete: true,
    };

    console.log('File uploaded:', data.id);
    return { data: dataWithPermissions, error: null };
  } catch (error) {
    console.error('uploadFile error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// MISE À JOUR - UPDATE FILE (écriture sur table files)
// ============================================================

/**
 * Met à jour un fichier
 * Note: UPDATE sur la table files (pas la vue)
 * v1.6.0: La vérification des droits est faite côté DB (RLS)
 */
export async function updateFile(
  id: string,
  input: UpdateFileInput
): Promise<ServiceResult<SourceFile>> {
  try {
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

    // v1.6.0: Plus de filtre created_by/layer côté client
    // La RLS vérifie les permissions côté DB
    const { data, error } = await supabase
      .schema('sources')
      .from('files')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('File updated:', id);
    return { data, error: null };
  } catch (error) {
    console.error('updateFile error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// SUPPRESSION (écriture sur table files)
// ============================================================

/**
 * Supprime un fichier
 * Note: DELETE sur la table files (pas la vue)
 * v1.6.0: La vérification des droits est faite côté DB (RLS)
 */
export async function deleteFile(id: string): Promise<ServiceResult<boolean>> {
  try {
    // Récupérer les infos du fichier pour le storage
    const { data: file, error: fetchError } = await supabase
      .schema('sources')
      .from('files')
      .select('storage_bucket, storage_path')
      .eq('id', id)
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
    // v1.6.0: La RLS vérifie les permissions côté DB
    const { error } = await supabase
      .schema('sources')
      .from('files')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('File deleted:', id);
    return { data: true, error: null };
  } catch (error) {
    console.error('deleteFile error:', error);
    return { data: null, error: error as Error };
  }
}
