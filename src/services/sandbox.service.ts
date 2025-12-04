// ============================================================
// ARPET - Sandbox Service (Supabase)
// Version: 1.0.2 - Fix types
// Date: 2025-12-04
// ============================================================

import { supabase } from '@/lib/supabase';
import type { 
  SandboxItem, 
  SandboxItemCreate, 
  SandboxItemUpdate,
  SandboxContent,
  SandboxItemStatus 
} from '@/types';
import { createEmptySandboxContent } from '@/types';

// ============================================================
// TYPES DE RETOUR
// ============================================================

interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

// ============================================================
// HELPER: Récupérer l'utilisateur courant
// ============================================================

async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  return user;
}

async function getCurrentProfile() {
  const user = await getCurrentUser();
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, vertical_id, org_id')
    .eq('id', user.id)
    .single();
  
  if (error || !profile) {
    throw new Error('Profile not found');
  }
  
  return profile;
}

// ============================================================
// LECTURE
// ============================================================

/**
 * Récupère tous les sandbox items de l'utilisateur courant
 * Filtrés automatiquement par RLS (vertical_id, org_id, user_id)
 */
export async function getSandboxItems(
  status?: SandboxItemStatus
): Promise<ServiceResult<SandboxItem[]>> {
  try {
    let query = supabase
      .from('sandbox_items')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('getSandboxItems error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Récupère les drafts (Bac à Sable)
 */
export async function getDrafts(): Promise<ServiceResult<SandboxItem[]>> {
  return getSandboxItems('draft');
}

/**
 * Récupère les items épinglés (Espace de Travail)
 */
export async function getPinnedItems(): Promise<ServiceResult<SandboxItem[]>> {
  return getSandboxItems('pinned');
}

/**
 * Récupère un sandbox item par son ID
 */
export async function getSandboxItemById(
  id: string
): Promise<ServiceResult<SandboxItem>> {
  try {
    const { data, error } = await supabase
      .from('sandbox_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('getSandboxItemById error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Récupère les items pour un projet spécifique
 */
export async function getSandboxItemsByProject(
  projectId: string,
  status?: SandboxItemStatus
): Promise<ServiceResult<SandboxItem[]>> {
  try {
    let query = supabase
      .from('sandbox_items')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('getSandboxItemsByProject error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// CRÉATION
// ============================================================

/**
 * Crée un nouveau sandbox item (draft)
 */
export async function createSandboxItem(
  input: SandboxItemCreate
): Promise<ServiceResult<SandboxItem>> {
  try {
    // Récupère le profil de l'utilisateur courant
    const profile = await getCurrentProfile();
    
    // Prépare le content avec les valeurs par défaut
    const content: SandboxContent = {
      ...createEmptySandboxContent(input.title, input.title),
      ...input.content,
    };
    
    const insertData = {
      vertical_id: profile.vertical_id,
      org_id: profile.org_id,
      user_id: profile.id,
      project_id: input.project_id || null,
      title: input.title,
      content,
      status: 'draft' as const,
      visibility: 'private' as const,
      source_qa_id: input.source_qa_id || null,
    };
    
    console.log('Creating sandbox item:', insertData);
    
    const { data, error } = await supabase
      .from('sandbox_items')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('Insert error:', error);
      throw error;
    }
    
    console.log('Sandbox item created:', data);
    return { data, error: null };
  } catch (error) {
    console.error('createSandboxItem error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// MISE À JOUR
// ============================================================

/**
 * Met à jour un sandbox item
 */
export async function updateSandboxItem(
  id: string,
  input: SandboxItemUpdate
): Promise<ServiceResult<SandboxItem>> {
  try {
    const { data, error } = await supabase
      .from('sandbox_items')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('updateSandboxItem error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Met à jour uniquement le content d'un sandbox item
 */
export async function updateSandboxContent(
  id: string,
  content: Partial<SandboxContent>
): Promise<ServiceResult<SandboxItem>> {
  try {
    // Récupère d'abord le content actuel
    const { data: current, error: fetchError } = await supabase
      .from('sandbox_items')
      .select('content')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Merge le content
    const mergedContent = {
      ...current.content,
      ...content,
    };
    
    const { data, error } = await supabase
      .from('sandbox_items')
      .update({ content: mergedContent })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('updateSandboxContent error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// ACTIONS WORKFLOW (via RPC)
// ============================================================

/**
 * Épingle un item (draft → pinned)
 * Passe du Bac à Sable vers l'Espace de Travail
 */
export async function pinSandboxItem(
  id: string
): Promise<ServiceResult<SandboxItem>> {
  try {
    const { data, error } = await supabase
      .rpc('pin_sandbox_item', { item_id: id });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('pinSandboxItem error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Dé-épingle un item (pinned → draft)
 * Repasse en mode édition
 */
export async function unpinSandboxItem(
  id: string
): Promise<ServiceResult<SandboxItem>> {
  try {
    const { data, error } = await supabase
      .rpc('unpin_sandbox_item', { item_id: id });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('unpinSandboxItem error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Archive un item (soft delete)
 */
export async function archiveSandboxItem(
  id: string
): Promise<ServiceResult<SandboxItem>> {
  try {
    const { data, error } = await supabase
      .rpc('archive_sandbox_item', { item_id: id });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('archiveSandboxItem error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// SUPPRESSION
// ============================================================

/**
 * Supprime définitivement un sandbox item
 */
export async function deleteSandboxItem(
  id: string
): Promise<ServiceResult<boolean>> {
  try {
    const { error } = await supabase
      .from('sandbox_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    console.error('deleteSandboxItem error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// HELPERS POUR L'AGENT
// ============================================================

/**
 * Ajoute un message à la conversation d'un sandbox
 */
export async function addMessageToSandbox(
  id: string,
  role: 'user' | 'agent',
  text: string
): Promise<ServiceResult<SandboxItem>> {
  try {
    // Récupère le content actuel
    const { data: current, error: fetchError } = await supabase
      .from('sandbox_items')
      .select('content')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Ajoute le message
    const messages = current.content.messages || [];
    const newMessage = {
      role,
      text,
      at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('sandbox_items')
      .update({
        content: {
          ...current.content,
          messages: [...messages, newMessage],
        },
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('addMessageToSandbox error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Met à jour le résultat affiché (après un run de l'agent)
 */
export async function updateSandboxResult(
  id: string,
  resultType: 'table' | 'chart' | 'number' | 'text',
  resultData: unknown
): Promise<ServiceResult<SandboxItem>> {
  try {
    const { data: current, error: fetchError } = await supabase
      .from('sandbox_items')
      .select('content')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    const { data, error } = await supabase
      .from('sandbox_items')
      .update({
        content: {
          ...current.content,
          display: {
            result_type: resultType,
            result_data: resultData,
            last_run_at: new Date().toISOString(),
          },
        },
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('updateSandboxResult error:', error);
    return { data: null, error: error as Error };
  }
}
