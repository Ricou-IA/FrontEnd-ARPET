// ============================================================
// INTERVENANTS - Types pour les contacts externes BTP
// Phase 4/8 Meeting V3 — Speaker Mapping
// ============================================================

/**
 * Intervenant (contact externe) : entreprise, sous-traitant, bureau d'etude, etc.
 * Correspond a la table core.intervenants
 */
export interface Intervenant {
  id: string;
  org_id: string;
  name: string;
  company: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Liaison intervenant <-> projet
 * Correspond a la table core.projet_intervenants
 */
export interface ProjetIntervenant {
  id: string;
  project_id: string;
  intervenant_id: string;
  lot_reference: string | null;
  role_in_project: string | null;
  created_at: string;
  /** Jointure enrichie (quand on fait un select avec join) */
  intervenant?: Intervenant;
}

/**
 * Intervenant enrichi avec son role/lot dans un projet specifique
 * Resultat de la jointure intervenants + projet_intervenants
 */
export interface IntervenantWithProjectRole extends Intervenant {
  lot_reference: string | null;
  role_in_project: string | null;
  projet_intervenant_id: string;
}

/**
 * Input pour la creation d'un intervenant
 */
export interface CreateIntervenantInput {
  name: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  specialty?: string;
}

/**
 * Input pour lier un intervenant a un projet
 */
export interface LinkIntervenantInput {
  intervenant_id: string;
  project_id: string;
  lot_reference?: string;
  role_in_project?: string;
}
