/**
 * Meeting Documents Service - Phase 7/8
 * Version: 2.0.0
 * Generation de documents a la demande (Memo chantier, Fiche lot)
 * Appelle l'Edge Function generate-document (deployee sur Supabase)
 *
 * v2.0.0 : Markdown = source de verite dans Storage.
 *   Preview via MarkdownViewer, export PDF a la volee au telechargement.
 * v1.1.0 : Fix body fields alignment avec EF deployee
 */

import { supabase } from '../lib/supabase';
import { convertMarkdownToPdf } from '../utils/markdown-to-pdf';
import type {
  GeneratedDocType,
  GeneratedDocResponse,
  ProjectLot,
} from '../types/meeting-document.types';

// ============================================================
// TYPES
// ============================================================

interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

// ============================================================
// GENERATION DE DOCUMENTS
// ============================================================

/**
 * Declenche la generation d'un document via l'Edge Function generate-document.
 * L'EF genere du Markdown et le stocke dans Storage/sources.files.
 * Le frontend affiche le preview via MarkdownViewer et exporte en PDF a la volee.
 */
export async function generateDocument(
  projectId: string,
  docType: GeneratedDocType,
  options?: { lot_reference?: string },
): Promise<ServiceResult<GeneratedDocResponse>> {
  try {
    if (import.meta.env.DEV) {
      console.log('[meeting-docs] Generating document:', docType, 'project:', projectId, options);
    }

    const { data, error } = await supabase.functions.invoke('generate-document', {
      body: {
        project_id: projectId,
        document_type: docType,
        ...(options?.lot_reference ? { lot_filter: options.lot_reference } : {}),
      },
    });

    if (error) {
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        throw new Error(
          'La fonction de generation de documents n\'est pas encore disponible. Elle sera deployee prochainement.'
        );
      }
      throw error;
    }

    if (!data?.file_id) {
      throw new Error('Reponse invalide de la fonction de generation');
    }

    const result: GeneratedDocResponse = {
      file_id: data.file_id,
      file_name: data.file_name || `${docType}_${new Date().toISOString().slice(0, 10)}.md`,
      download_url: data.download_url || '',
      doc_type: docType,
    };

    if (import.meta.env.DEV) {
      console.log('[meeting-docs] Document generated:', result.file_id);
    }

    return { data: result, error: null };
  } catch (error) {
    console.error('[meeting-docs] generateDocument error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// EXPORT PDF A LA VOLEE
// ============================================================

/**
 * Telecharge un document .md depuis Storage, le convertit en PDF cote client,
 * et declenche le telechargement du PDF.
 *
 * @param bucket - Bucket Storage
 * @param storagePath - Chemin du fichier .md
 * @param filename - Nom du fichier original (.md)
 */
export async function downloadAsPdf(
  bucket: string,
  storagePath: string,
  filename: string,
): Promise<{ error: Error | null }> {
  try {
    // 1. Signed URL pour lire le .md
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 300); // 5 min

    if (signedError || !signedData?.signedUrl) {
      throw new Error('Impossible de recuperer le document');
    }

    // 2. Fetch le contenu markdown
    const response = await fetch(signedData.signedUrl);
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }
    const markdown = await response.text();

    // 3. Convertir en PDF
    const title = filename.replace(/\.md$/, '').replace(/_/g, ' ');
    const pdfBlob = await convertMarkdownToPdf(markdown, title);

    // 4. Declencher le telechargement
    const pdfFilename = filename.replace(/\.md$/, '.pdf');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = pdfFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (import.meta.env.DEV) {
      console.log('[meeting-docs] PDF downloaded:', pdfFilename, pdfBlob.size, 'bytes');
    }

    return { error: null };
  } catch (error) {
    console.error('[meeting-docs] downloadAsPdf error:', error);
    return { error: error as Error };
  }
}

// ============================================================
// LOTS DU PROJET (pour dropdown Fiche Lot)
// ============================================================

/**
 * Recupere les lots distincts d'un projet avec les infos de l'intervenant.
 * Query : core.projet_intervenants join core.intervenants filtred par project_id
 */
export async function getProjectLots(
  projectId: string
): Promise<ServiceResult<ProjectLot[]>> {
  try {
    const { data, error } = await supabase
      .schema('core')
      .from('projet_intervenants')
      .select(`
        lot_reference,
        intervenants (
          name,
          company
        )
      `)
      .eq('project_id', projectId)
      .not('lot_reference', 'is', null);

    if (error) {
      // RLS peut retourner 403 quand 0 lignes avec un join — on traite comme vide
      if (import.meta.env.DEV) {
        console.log('[meeting-docs] getProjectLots query returned error (may be 0 results with RLS):', error.message);
      }
      return { data: [], error: null };
    }

    // Dedup par lot_reference et formater
    const lotsMap = new Map<string, ProjectLot>();

    for (const row of data || []) {
      const lotRef = row.lot_reference as string;
      if (!lotRef || lotsMap.has(lotRef)) continue;

      const intervenant = row.intervenants as unknown as { name: string | null; company: string | null };

      lotsMap.set(lotRef, {
        lot_reference: lotRef,
        intervenant_name: intervenant?.name || null,
        company: intervenant?.company || null,
      });
    }

    // Trier par lot_reference alphabetiquement
    const lots = Array.from(lotsMap.values()).sort((a, b) =>
      a.lot_reference.localeCompare(b.lot_reference, 'fr')
    );

    if (import.meta.env.DEV) {
      console.log('[meeting-docs] Project lots loaded:', lots.length);
    }

    return { data: lots, error: null };
  } catch (error) {
    console.error('[meeting-docs] getProjectLots error:', error);
    return { data: null, error: error as Error };
  }
}
