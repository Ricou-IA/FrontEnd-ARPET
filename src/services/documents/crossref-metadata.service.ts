// ============================================================
// CrossRef Metadata Service
// Recupere les lots et normes distincts indexes pour un projet
// ============================================================

import { supabase } from '@/lib/supabase';
import type { ServiceResult } from './document-auth.helper';

// ============================================================
// TYPES
// ============================================================

export interface CrossRefMetadata {
  lots: string[]
  norms: string[]
  documents: Array<{ id: string; name: string }>
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Normalise un label : trim + title case
 * "PLOMBERIE SANITAIRE" → "Plomberie sanitaire"
 * "lot CVC" → "Lot CVC"
 */
function normalizeLabel(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return trimmed
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
}

/**
 * Deduplique un tableau de strings en ignorant la casse.
 * Garde la version normalisee.
 */
function deduplicateNormalized(items: string[]): string[] {
  const seen = new Map<string, string>()
  for (const item of items) {
    const normalized = normalizeLabel(item)
    const key = normalized.toLowerCase()
    // Garder la premiere occurrence normalisee
    if (!seen.has(key) && normalized.length > 0) {
      seen.set(key, normalized)
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, 'fr'))
}

// ============================================================
// SERVICE
// ============================================================

/**
 * Recupere les metadata cross-ref pour un projet :
 * - lots distincts (qui_lots des chunks du projet)
 * - normes distinctes (comment_normes des chunks du projet)
 * - liste des documents du projet
 *
 * Performance : <500ms pour ~400 chunks (spec budget)
 */
export async function getCrossRefMetadata(
  projectId: string
): Promise<ServiceResult<CrossRefMetadata>> {
  try {
    // 1. Recuperer les fichiers du projet
    const { data: files, error: filesError } = await supabase
      .schema('sources')
      .from('files_with_permissions')
      .select('id, original_filename')
      .eq('layer', 'project')
      .eq('project_id', projectId)
      .eq('processing_status', 'completed')
      .order('original_filename', { ascending: true })

    if (filesError) throw filesError

    if (!files || files.length === 0) {
      return {
        data: { lots: [], norms: [], documents: [] },
        error: null,
      }
    }

    const fileIds = files.map(f => f.id)
    const documents = files.map(f => ({
      id: f.id,
      name: f.original_filename,
    }))

    // 2. Recuperer qui_lots et comment_normes des chunks du projet
    const { data: chunks, error: chunksError } = await supabase
      .schema('rag')
      .from('documents')
      .select('qui_lots, comment_normes')
      .in('source_file_id', fileIds)

    if (chunksError) throw chunksError

    // 3. Flatten + deduplique
    const rawLots: string[] = []
    const rawNorms: string[] = []

    if (chunks) {
      for (const chunk of chunks) {
        if (Array.isArray(chunk.qui_lots)) {
          rawLots.push(...chunk.qui_lots)
        }
        if (Array.isArray(chunk.comment_normes)) {
          rawNorms.push(...chunk.comment_normes)
        }
      }
    }

    const lots = deduplicateNormalized(rawLots)
    const norms = deduplicateNormalized(rawNorms)

    return {
      data: { lots, norms, documents },
      error: null,
    }
  } catch (error) {
    console.error('getCrossRefMetadata error:', error)
    return { data: null, error: error as Error }
  }
}
