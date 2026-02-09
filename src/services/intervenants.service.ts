/**
 * Intervenants Service - Phase 4/8 Meeting V3
 * Version: 1.0.0
 * CRUD pour les intervenants (contacts externes BTP) et leurs liaisons projet
 */

import { supabase } from '../lib/supabase';
import { getCurrentProfile } from './documents/document-auth.helper';
import type { ServiceResult } from './documents/document-auth.helper';
import type {
  Intervenant,
  ProjetIntervenant,
  IntervenantWithProjectRole,
  CreateIntervenantInput,
} from '../types/intervenant.types';

// ============================================================
// QUERIES (lecture)
// ============================================================

/**
 * Recupere les intervenants lies a un projet avec leur role/lot
 * Jointure core.projet_intervenants + core.intervenants
 */
export async function getProjectIntervenants(
  projectId: string
): Promise<ServiceResult<IntervenantWithProjectRole[]>> {
  try {
    const { data, error } = await supabase
      .schema('core')
      .from('projet_intervenants')
      .select(`
        id,
        project_id,
        intervenant_id,
        lot_reference,
        role_in_project,
        created_at,
        intervenants:intervenant_id (
          id,
          org_id,
          name,
          company,
          role,
          email,
          phone,
          specialty,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Aplatir la jointure en IntervenantWithProjectRole[]
    const intervenants: IntervenantWithProjectRole[] = (data || [])
      .filter((row: Record<string, unknown>) => row.intervenants)
      .map((row: Record<string, unknown>) => {
        const intervenant = row.intervenants as Intervenant;
        return {
          ...intervenant,
          lot_reference: row.lot_reference as string | null,
          role_in_project: row.role_in_project as string | null,
          projet_intervenant_id: row.id as string,
        };
      });

    return { data: intervenants, error: null };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[IntervenantsService] getProjectIntervenants error:', error);
    }
    return { data: null, error: error as Error };
  }
}

/**
 * Recupere tous les intervenants de l'organisation courante
 */
export async function getOrgIntervenants(): Promise<ServiceResult<Intervenant[]>> {
  try {
    const profile = await getCurrentProfile();

    if (!profile.org_id) {
      throw new Error('No organization found for current user');
    }

    const { data, error } = await supabase
      .schema('core')
      .from('intervenants')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('name', { ascending: true });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[IntervenantsService] getOrgIntervenants error:', error);
    }
    return { data: null, error: error as Error };
  }
}

/**
 * Recherche des intervenants par nom ou entreprise dans l'org courante
 */
export async function searchIntervenants(
  query: string
): Promise<ServiceResult<Intervenant[]>> {
  try {
    const profile = await getCurrentProfile();

    if (!profile.org_id) {
      throw new Error('No organization found for current user');
    }

    const searchTerm = `%${query}%`;

    const { data, error } = await supabase
      .schema('core')
      .from('intervenants')
      .select('*')
      .eq('org_id', profile.org_id)
      .or(`name.ilike.${searchTerm},company.ilike.${searchTerm}`)
      .order('name', { ascending: true })
      .limit(20);

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[IntervenantsService] searchIntervenants error:', error);
    }
    return { data: null, error: error as Error };
  }
}

// ============================================================
// MUTATIONS (ecriture)
// ============================================================

/**
 * Cree un nouvel intervenant dans l'organisation courante
 */
export async function createIntervenant(
  input: CreateIntervenantInput
): Promise<ServiceResult<Intervenant>> {
  try {
    const profile = await getCurrentProfile();

    if (!profile.org_id) {
      throw new Error('No organization found for current user');
    }

    const record = {
      org_id: profile.org_id,
      name: input.name,
      company: input.company || null,
      role: input.role || null,
      email: input.email || null,
      phone: input.phone || null,
      specialty: input.specialty || null,
      created_by: profile.id,
    };

    const { data, error } = await supabase
      .schema('core')
      .from('intervenants')
      .insert(record)
      .select()
      .single();

    if (error) throw error;

    return { data: data as Intervenant, error: null };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[IntervenantsService] createIntervenant error:', error);
    }
    return { data: null, error: error as Error };
  }
}

/**
 * Lie un intervenant a un projet avec un lot/role optionnel
 */
export async function linkIntervenantToProject(
  intervenantId: string,
  projectId: string,
  lotReference?: string,
  roleInProject?: string
): Promise<ServiceResult<ProjetIntervenant>> {
  try {
    const record = {
      intervenant_id: intervenantId,
      project_id: projectId,
      lot_reference: lotReference || null,
      role_in_project: roleInProject || null,
    };

    const { data, error } = await supabase
      .schema('core')
      .from('projet_intervenants')
      .insert(record)
      .select()
      .single();

    if (error) throw error;

    return { data: data as ProjetIntervenant, error: null };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[IntervenantsService] linkIntervenantToProject error:', error);
    }
    return { data: null, error: error as Error };
  }
}

/**
 * Supprime la liaison entre un intervenant et un projet
 */
export async function unlinkIntervenantFromProject(
  projetIntervenantId: string
): Promise<ServiceResult<void>> {
  try {
    const { error } = await supabase
      .schema('core')
      .from('projet_intervenants')
      .delete()
      .eq('id', projetIntervenantId);

    if (error) throw error;

    return { data: undefined as unknown as void, error: null };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[IntervenantsService] unlinkIntervenantFromProject error:', error);
    }
    return { data: null, error: error as Error };
  }
}

/**
 * Cree un intervenant et le lie directement a un projet
 * Raccourci pour le flow "creer + lier" depuis le speaker mapping
 */
export async function createAndLinkIntervenant(
  input: CreateIntervenantInput,
  projectId: string,
  lotReference?: string,
  roleInProject?: string
): Promise<ServiceResult<IntervenantWithProjectRole>> {
  try {
    // 1. Creer l'intervenant
    const { data: intervenant, error: createError } = await createIntervenant(input);
    if (createError || !intervenant) {
      throw createError || new Error('Failed to create intervenant');
    }

    // 2. Le lier au projet
    const { data: link, error: linkError } = await linkIntervenantToProject(
      intervenant.id,
      projectId,
      lotReference,
      roleInProject
    );
    if (linkError || !link) {
      throw linkError || new Error('Failed to link intervenant to project');
    }

    // 3. Retourner l'intervenant enrichi
    const result: IntervenantWithProjectRole = {
      ...intervenant,
      lot_reference: link.lot_reference,
      role_in_project: link.role_in_project,
      projet_intervenant_id: link.id,
    };

    return { data: result, error: null };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[IntervenantsService] createAndLinkIntervenant error:', error);
    }
    return { data: null, error: error as Error };
  }
}
