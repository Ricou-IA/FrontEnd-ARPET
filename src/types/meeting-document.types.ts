/**
 * Meeting Documents Types - Phase 7/8
 * Types pour la generation de documents a la demande
 * (Memo de chantier, Fiche lot)
 */

// ============================================================
// TYPES
// ============================================================

/** Type de document genereable */
export type GeneratedDocType = 'memo_chantier' | 'fiche_lot';

/** Requete de generation vers l'Edge Function */
export interface GenerateDocRequest {
  project_id: string;
  doc_type: GeneratedDocType;
  lot_reference?: string;
}

/** Reponse de l'Edge Function apres generation */
export interface GeneratedDocResponse {
  file_id: string;
  file_name: string;
  download_url: string;
  doc_type: GeneratedDocType;
}

/** Lot d'un projet (pour le dropdown Fiche Lot) */
export interface ProjectLot {
  lot_reference: string;
  intervenant_name: string | null;
  company: string | null;
}

// ============================================================
// CONFIG UI
// ============================================================

export const GENERATED_DOC_CONFIG: Record<GeneratedDocType, {
  label: string;
  description: string;
  icon: string;
}> = {
  memo_chantier: {
    label: 'Memo de chantier',
    description: 'Synthese globale : avancement, risques, decisions cles, actions ouvertes',
    icon: 'clipboard',
  },
  fiche_lot: {
    label: 'Fiche Lot',
    description: 'Prescriptions contractuelles, decisions prises, actions en cours, points de vigilance',
    icon: 'hard-hat',
  },
};
