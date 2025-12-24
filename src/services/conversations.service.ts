// ============================================================
// ARPET - Conversations Service
// Version: 1.2.0 - Liaison rag_conversation_id
// Date: 2025-12-21
// ============================================================

import { supabase } from '../lib/supabase'
import type { SavedConversation, SavedConversationCreate, Message } from '../types'

// Type pour les résultats de service
interface ServiceResult<T> {
  data: T | null
  error: Error | null
}

// ============================================================
// LECTURE
// ============================================================

/**
 * Récupère les conversations sauvegardées de l'utilisateur
 * Filtrées par project_id si fourni (isolation par chantier)
 * Triées par date de mise à jour décroissante
 */
export async function getSavedConversations(
  projectId?: string | null
): Promise<ServiceResult<SavedConversation[]>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Utilisateur non connecté')
    }

    let query = supabase
      .schema('arpet')
      .from('saved_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    // Filtrer par projet si fourni (isolation par chantier)
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) throw error

    // Convertir les messages JSONB en objets Message avec Date
    const conversations: SavedConversation[] = (data || []).map(conv => ({
      ...conv,
      messages: (conv.messages || []).map((msg: Record<string, unknown>) => ({
        ...msg,
        timestamp: new Date(msg.timestamp as string)
      })) as Message[]
    }))

    return { data: conversations, error: null }
  } catch (error) {
    console.error('getSavedConversations error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Récupère une conversation par son ID
 */
export async function getSavedConversationById(id: string): Promise<ServiceResult<SavedConversation>> {
  try {
    const { data, error } = await supabase
      .schema('arpet')
      .from('saved_conversations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    // Convertir les messages JSONB en objets Message avec Date
    const conversation: SavedConversation = {
      ...data,
      messages: (data.messages || []).map((msg: Record<string, unknown>) => ({
        ...msg,
        timestamp: new Date(msg.timestamp as string)
      })) as Message[]
    }

    return { data: conversation, error: null }
  } catch (error) {
    console.error('getSavedConversationById error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================
// CRÉATION
// ============================================================

/**
 * Crée une nouvelle conversation sauvegardée
 * org_id est optionnel (déduit du profil si disponible)
 * rag_conversation_id lie la conversation RAG pour conserver le contexte
 */
export async function createSavedConversation(
  input: SavedConversationCreate & { rag_conversation_id?: string | null }
): Promise<ServiceResult<SavedConversation>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Utilisateur non connecté')
    }

    // Récupérer le profil pour org_id (optionnel)
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    // org_id est optionnel - on le prend s'il existe
    const orgId = profile?.org_id || null

    // Préparer les messages pour stockage JSONB
    // Convertir les Date en string ISO
    const messagesForStorage = input.messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date 
        ? msg.timestamp.toISOString() 
        : msg.timestamp
    }))

    const { data, error } = await supabase
      .schema('arpet')
      .from('saved_conversations')
      .insert({
        app_id: 'arpet',
        org_id: orgId,
        user_id: user.id,
        title: input.title,
        messages: messagesForStorage,
        project_id: input.project_id || null,
        source_qa_id: input.source_qa_id || null,
        rag_conversation_id: input.rag_conversation_id || null,
      })
      .select()
      .single()

    if (error) throw error

    // Convertir les messages retournés
    const conversation: SavedConversation = {
      ...data,
      messages: (data.messages || []).map((msg: Record<string, unknown>) => ({
        ...msg,
        timestamp: new Date(msg.timestamp as string)
      })) as Message[]
    }

    console.log('✅ Conversation saved:', data.id, 'rag_id:', input.rag_conversation_id)
    return { data: conversation, error: null }
  } catch (error) {
    console.error('createSavedConversation error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================
// SUPPRESSION
// ============================================================

/**
 * Supprime une conversation sauvegardée
 * Supprime aussi la conversation RAG liée si elle existe
 */
export async function deleteSavedConversation(
  id: string, 
  ragConversationId?: string | null
): Promise<ServiceResult<void>> {
  try {
    // D'abord supprimer la conversation RAG liée si elle existe
    if (ragConversationId) {
      console.log('🗑️ Deleting RAG conversation:', ragConversationId)
      const { error: ragError } = await supabase
        .schema('rag')
        .rpc('delete_conversation', {
          p_conversation_id: ragConversationId
        })
      
      if (ragError) {
        console.warn('⚠️ Error deleting RAG conversation:', ragError)
        // On continue quand même pour supprimer la saved_conversation
      } else {
        console.log('✅ RAG conversation deleted')
      }
    }

    // Supprimer la saved_conversation
    const { error } = await supabase
      .schema('arpet')
      .from('saved_conversations')
      .delete()
      .eq('id', id)

    if (error) throw error

    console.log('✅ Saved conversation deleted:', id)
    return { data: undefined, error: null }
  } catch (error) {
    console.error('deleteSavedConversation error:', error)
    return { data: null, error: error as Error }
  }
}

// ============================================================
// MISE À JOUR (pour usage futur)
// ============================================================

/**
 * Met à jour le titre d'une conversation
 */
export async function updateConversationTitle(
  id: string, 
  title: string
): Promise<ServiceResult<SavedConversation>> {
  try {
    const { data, error } = await supabase
      .schema('arpet')
      .from('saved_conversations')
      .update({ title })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const conversation: SavedConversation = {
      ...data,
      messages: (data.messages || []).map((msg: Record<string, unknown>) => ({
        ...msg,
        timestamp: new Date(msg.timestamp as string)
      })) as Message[]
    }

    return { data: conversation, error: null }
  } catch (error) {
    console.error('updateConversationTitle error:', error)
    return { data: null, error: error as Error }
  }
}
