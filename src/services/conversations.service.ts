// ============================================================
// ARPET - Conversations Service
// Version: 1.0.0 - Service pour saved_conversations
// Date: 2025-12-19
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
 * Récupère toutes les conversations sauvegardées de l'utilisateur
 * Triées par date de mise à jour décroissante
 */
export async function getSavedConversations(): Promise<ServiceResult<SavedConversation[]>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Utilisateur non connecté')
    }

    const { data, error } = await supabase
      .schema('arpet')
      .from('saved_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

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
 */
export async function createSavedConversation(
  input: SavedConversationCreate
): Promise<ServiceResult<SavedConversation>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Utilisateur non connecté')
    }

    // Récupérer le profil pour org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      throw new Error('Profil utilisateur incomplet (org_id manquant)')
    }

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
        org_id: profile.org_id,
        user_id: user.id,
        title: input.title,
        messages: messagesForStorage,
        project_id: input.project_id || null,
        source_qa_id: input.source_qa_id || null,
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

    console.log('✅ Conversation saved:', data.id)
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
 */
export async function deleteSavedConversation(id: string): Promise<ServiceResult<void>> {
  try {
    const { error } = await supabase
      .schema('arpet')
      .from('saved_conversations')
      .delete()
      .eq('id', id)

    if (error) throw error

    console.log('✅ Conversation deleted:', id)
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
