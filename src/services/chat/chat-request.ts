// ============================================================
// ARPET - Chat Request (appel classique non-streaming)
// ============================================================

import { supabase } from '../../lib/supabase'
import { mapResponse } from './chat-mapping'
import { getRagBackend, getRagEndpoint } from './chat-config'
import type { ChatRequest, RawChatResponse, ChatResult } from './chat-types'

// ============================================================
// SERVICE
// ============================================================

export async function sendMessage(request: ChatRequest): Promise<ChatResult> {
  try {
    const {
      query,
      user_id,
      org_id = null,
      project_id = null,
      conversation_id = null,
      generation_mode,
      intent,
      rewritten_query,
      detected_documents,
      enable_suggestions,
    } = request

    if (!query?.trim()) {
      throw new Error('La question est requise')
    }

    // Résoudre le backend au moment de l'appel (toggle A/B live)
    const activeBackend = getRagBackend()
    const activeEndpoint = getRagEndpoint()

    if (import.meta.env.DEV) {
      console.log(`[ChatService] Envoi vers ${activeEndpoint} (backend=${activeBackend})`)
    }

    const body: Record<string, unknown> = {
      query: query.trim(),
      user_id,
      org_id,
      project_id,
      conversation_id,
      stream: false,
    }

    if (activeBackend === 'retrieval') {
      // baikal-retrieval attend toujours generation_mode
      body.generation_mode = generation_mode || 'auto'
    } else {
      if (generation_mode && generation_mode !== 'auto') {
        body.generation_mode = generation_mode
      }
    }
    if (intent) body.intent = intent
    if (rewritten_query) body.rewritten_query = rewritten_query
    if (detected_documents?.length) body.detected_documents = detected_documents
    if (enable_suggestions) body.enable_suggestions = true

    const { data, error } = await supabase.functions.invoke(activeEndpoint, { body })

    if (error) {
      console.error(`[ChatService] Erreur Edge Function:`, error)
      throw error
    }

    if (import.meta.env.DEV) {
      console.log(`[ChatService] Réponse reçue en ${data?.processing_time_ms || '?'}ms`)
    }

    return {
      data: mapResponse(data as RawChatResponse),
      error: null,
    }
  } catch (error) {
    console.error('[ChatService] Erreur:', error)
    return {
      data: null,
      error: error as Error,
    }
  }
}
