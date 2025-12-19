// ============================================================
// ARPET - Sandbox Service (Supabase)
// Version: 2.0.0 - Migration vers schémas dédiés
// Date: 2025-12-11
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
    .schema('core')
    .from('profiles')
    .select('id, app_id, org_id')
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
 */
export async function getSandboxItems(
  status?: SandboxItemStatus
): Promise<ServiceResult<SandboxItem[]>> {
  try {
    let query = supabase
      .schema('arpet')
      .from('sandbox_items')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('getSandboxItems error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Récupère un sandbox item par son ID
 */
export async function getSandboxItemById(
  id: string
): Promise<ServiceResult<SandboxItem>> {
  try {
    const { data, error } = await supabase
      .schema('arpet')
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
    const profile = await getCurrentProfile();
    
    const content: SandboxContent = {
      ...createEmptySandboxContent(input.title, input.title),
      ...input.content,
    };
    
    const insertData = {
      app_id: profile.app_id,
      org_id: profile.org_id,
      user_id: profile.id,
      project_id: input.project_id || null,
      title: input.title,
      content,
      status: 'draft' as const,
      visibility: 'private' as const,
      source_qa_id: input.source_qa_id || null,
    };
    
    console.log('📝 Creating sandbox item:', insertData.title);
    
    const { data, error } = await supabase
      .schema('arpet')
      .from('sandbox_items')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Insert error:', error);
      throw error;
    }
    
    console.log('✅ Sandbox item created:', data.id);
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
      .schema('arpet')
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
  contentUpdate: Partial<SandboxContent>
): Promise<ServiceResult<SandboxItem>> {
  try {
    // Récupère d'abord le content actuel
    const { data: current, error: fetchError } = await supabase
      .schema('arpet')
      .from('sandbox_items')
      .select('content')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Merge le content
    const mergedContent = {
      ...current.content,
      ...contentUpdate,
    };
    
    const { data, error } = await supabase
      .schema('arpet')
      .from('sandbox_items')
      .update({ 
        content: mergedContent,
        updated_at: new Date().toISOString(),
      })
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
// ACTIONS WORKFLOW (UPDATE direct - pas de RPC)
// ============================================================

/**
 * Épingle un item (draft → pinned)
 */
export async function pinSandboxItem(
  id: string
): Promise<ServiceResult<SandboxItem>> {
  try {
    console.log('📌 Pinning sandbox item:', id);
    
    const { data, error } = await supabase
      .schema('arpet')
      .from('sandbox_items')
      .update({
        status: 'pinned',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Pin error:', error);
      throw error;
    }
    
    console.log('✅ Item pinned:', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('pinSandboxItem error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Dé-épingle un item (pinned → draft)
 */
export async function unpinSandboxItem(
  id: string
): Promise<ServiceResult<SandboxItem>> {
  try {
    console.log('📍 Unpinning sandbox item:', id);
    
    const { data, error } = await supabase
      .schema('arpet')
      .from('sandbox_items')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Unpin error:', error);
      throw error;
    }
    
    console.log('✅ Item unpinned:', data.id);
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
    console.log('🗃️ Archiving sandbox item:', id);
    
    const { data, error } = await supabase
      .schema('arpet')
      .from('sandbox_items')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Archive error:', error);
      throw error;
    }
    
    console.log('✅ Item archived:', data.id);
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
    console.log('🗑️ Deleting sandbox item:', id);
    
    const { error } = await supabase
      .schema('arpet')
      .from('sandbox_items')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ Delete error:', error);
      throw error;
    }
    
    console.log('✅ Item deleted');
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
    const { data: current, error: fetchError } = await supabase
      .schema('arpet')
      .from('sandbox_items')
      .select('content')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    const messages = current.content.messages || [];
    const newMessage = {
      role,
      text,
      at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .schema('arpet')
      .from('sandbox_items')
      .update({
        content: {
          ...current.content,
          messages: [...messages, newMessage],
        },
        updated_at: new Date().toISOString(),
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
