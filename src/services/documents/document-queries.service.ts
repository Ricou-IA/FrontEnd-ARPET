// ============================================================
// Document Queries Service
// Opérations de lecture sur les documents
// ============================================================

import { supabase } from '@/lib/supabase';
import type { SourceFile, DocumentLayer } from '@/types';
import { getCurrentProfile, type ServiceResult } from './document-auth.helper';

// ============================================================
// LECTURE - GET FILES (via vue files_with_permissions)
// ============================================================

/**
 * Récupère les fichiers par couche documentaire
 * Utilise la vue files_with_permissions pour avoir can_edit/can_delete
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

    // v1.6.0: Utiliser la vue avec permissions
    let query = supabase
      .schema('sources')
      .from('files_with_permissions')
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
 * Utilise la vue files_with_permissions pour avoir can_edit/can_delete
 */
export async function getFileById(id: string): Promise<ServiceResult<SourceFile>> {
  try {
    // v1.6.0: Utiliser la vue avec permissions
    const { data, error } = await supabase
      .schema('sources')
      .from('files_with_permissions')
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
 * Récupère l'URL de téléchargement d'un fichier.
 * @param forceDownload - Si true, ajoute Content-Disposition: attachment
 *   pour forcer le telechargement (utile pour .md, .txt que le navigateur ouvre inline)
 */
export async function getFileDownloadUrl(
  bucket: string,
  path: string,
  forceDownload?: boolean
): Promise<ServiceResult<string>> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600, {
        download: forceDownload || false,
      }); // 1 heure

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

    // 2. Récupérer le fichier source (via vue avec permissions)
    const { data: file, error: fileError } = await supabase
      .schema('sources')
      .from('files_with_permissions')
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
    // v1.6.0: Utiliser la vue avec permissions
    const { data: file, error } = await supabase
      .schema('sources')
      .from('files_with_permissions')
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
