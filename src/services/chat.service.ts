// ============================================================
// ARPET - Chat Service
// Version: 2.2.0 - Parsing SSE robuste
// Date: 2024-12-31
// Fix: Parsing simplifié pour ne pas perdre de tokens
// ============================================================

import { supabase } from '../lib/supabase'
import type { 
  MessageSource, 
  KnowledgeType, 
  AgentSource, 
  VoteContext 
} from '../types'

// ============================================================
// CONFIGURATION
// ============================================================

const RAG_ENDPOINT = 'baikal-librarian'

const SUPABASE_URL = 'https://odspcxgafcqxjzrarsqf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kc3BjeGdhZmNxeGp6cmFyc3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODcwNzUsImV4cCI6MjA3OTE2MzA3NX0.DKCg_EwasSi_SNto8D3rC5H7FaShuUra8cGQ6g9Q58g'

// ============================================================
// TYPES
// ============================================================

export interface ChatRequest {
  query: string
  user_id: string | null
  org_id?: string | null
  project_id?: string | null
  conversation_id?: string | null
  generation_mode?: 'auto' | 'chunks' | 'gemini'
  intent?: string
  rewritten_query?: string
  detected_documents?: string[]
}

interface RawChatResponse {
  response: string
  conversation_id?: string
  sources?: Array<{
    id?: string
    type?: string
    source_file_id?: string
    document_name?: string
    name?: string
    score?: number
    layer?: string
    content_preview?: string | null
    document_id?: string
    chunk_id?: string
    authority_label?: string
    qa_id?: string
  }>
  documents_found?: number
  qa_memory_found?: number
  processing_time_ms?: number
  generation_mode?: string
  generation_mode_ui?: string
  cache_status?: string
  knowledge_type?: string
  validation_count?: number
  agent_source?: string
  prompt_used?: string
  prompt_resolution?: string
  can_vote?: boolean
  vote_context?: {
    question: string
    answer: string
    source_ids: (string | undefined)[]
  }
  analysis?: {
    intent: string
    rewritten_query: string
    detected_documents: string[]
    reasoning: string
  }
}

export interface ChatResponse {
  response: string
  conversation_id?: string
  sources?: MessageSource[]
  documents_found?: number
  qa_memory_found?: number
  processing_time_ms?: number
  generation_mode?: 'chunks' | 'gemini' | 'hybrid'
  generation_mode_ui?: string
  cache_status?: 'hit' | 'miss' | 'none'
  knowledge_type?: KnowledgeType
  validation_count?: number
  agent_source?: AgentSource
  prompt_used?: string
  prompt_resolution?: string
  can_vote?: boolean
  vote_context?: VoteContext
  analysis?: {
    intent: string
    rewritten_query: string
    detected_documents: string[]
    reasoning: string
  }
  files_count?: number
  chunks_count?: number
  total_pages?: number
  filter_applied?: boolean
  fallback_used?: boolean
  is_follow_up?: boolean
  cache_hits?: number
  cache_misses?: number
}

export interface ChatResult {
  data: ChatResponse | null
  error: Error | null
}

export interface SSEStepEvent {
  step: string
  message: string
  details?: {
    files_count?: number
    total_pages?: number
    mode?: string
    internal_mode?: string
    filters?: string[]
    cache_hits?: number
    cache_misses?: number
    [key: string]: unknown
  }
}

interface SSESourcesPayload {
  sources: Array<{
    id?: string | number
    type?: string
    source_file_id?: string | null
    chunk_id?: string | number
    document_name?: string
    name?: string
    score?: number
    layer?: string
    content_preview?: string | null
  }>
  conversation_id: string
  generation_mode: string
  generation_mode_ui?: string
  processing_time_ms: number
  files_count?: number
  chunks_count?: number
  total_pages?: number
  documents_found?: number
  filter_applied?: boolean
  fallback_used?: boolean
  is_follow_up?: boolean
  cache_hits?: number
  cache_misses?: number
  cache_status?: string | null
  intent?: string | null
  query_rewritten?: boolean
}

// ============================================================
// HELPERS - MAPPING DES TYPES
// ============================================================

function mapSources(rawSources?: RawChatResponse['sources']): MessageSource[] | undefined {
  if (!rawSources || rawSources.length === 0) return undefined
  
  return rawSources.map(source => ({
    id: source.id,
    type: source.type === 'document' || source.type === 'qa_memory' 
      ? source.type 
      : 'document',
    source_file_id: source.source_file_id,
    document_name: source.document_name,
    name: source.name,
    score: source.score,
    content_preview: source.content_preview || undefined,
    document_id: source.document_id,
    chunk_id: source.chunk_id,
    authority_label: source.authority_label as MessageSource['authority_label'],
    qa_id: source.qa_id,
  }))
}

function mapSSESources(rawSources?: SSESourcesPayload['sources']): MessageSource[] | undefined {
  if (!rawSources || rawSources.length === 0) return undefined
  
  return rawSources.map(source => ({
    id: source.id?.toString(),
    type: source.type === 'document' || source.type === 'qa_memory' 
      ? source.type 
      : 'document',
    source_file_id: source.source_file_id || undefined,
    document_name: source.document_name,
    name: source.name,
    score: source.score,
    content_preview: source.content_preview || undefined,
    chunk_id: source.chunk_id?.toString(),
  }))
}

function mapCacheStatus(status?: string | null): 'hit' | 'miss' | 'none' | undefined {
  if (!status) return undefined
  if (status === 'hit') return 'hit'
  if (status === 'miss' || status === 'partial') return 'miss'
  return 'none'
}

function mapGenerationMode(mode?: string): 'chunks' | 'gemini' | 'hybrid' | undefined {
  if (!mode) return undefined
  if (mode === 'chunks' || mode === 'gemini' || mode === 'hybrid') return mode
  return 'chunks'
}

function mapKnowledgeType(type?: string): KnowledgeType | undefined {
  if (!type) return undefined
  const validTypes: KnowledgeType[] = [
    'none', 'shared', 'organization', 'project', 'personal', 
    'global', 'new', 'team_validated', 'expert_validated'
  ]
  return validTypes.includes(type as KnowledgeType) 
    ? (type as KnowledgeType) 
    : 'shared'
}

function mapAgentSource(source?: string): AgentSource | undefined {
  if (!source) return undefined
  if (source === 'librarian' || source === 'analyst' || source === 'user') {
    return source
  }
  return 'librarian'
}

function mapVoteContext(context?: RawChatResponse['vote_context']): VoteContext | undefined {
  if (!context) return undefined
  return {
    question: context.question,
    answer: context.answer,
    source_ids: context.source_ids.filter((id): id is string => id !== undefined),
  }
}

function mapResponse(raw: RawChatResponse): ChatResponse {
  return {
    response: raw.response,
    conversation_id: raw.conversation_id,
    sources: mapSources(raw.sources),
    documents_found: raw.documents_found,
    qa_memory_found: raw.qa_memory_found,
    processing_time_ms: raw.processing_time_ms,
    generation_mode: mapGenerationMode(raw.generation_mode),
    generation_mode_ui: raw.generation_mode_ui,
    cache_status: mapCacheStatus(raw.cache_status),
    knowledge_type: mapKnowledgeType(raw.knowledge_type),
    validation_count: raw.validation_count,
    agent_source: mapAgentSource(raw.agent_source),
    prompt_used: raw.prompt_used,
    prompt_resolution: raw.prompt_resolution,
    can_vote: raw.can_vote,
    vote_context: mapVoteContext(raw.vote_context),
    analysis: raw.analysis,
  }
}

function mapSSESourcesPayload(payload: SSESourcesPayload): Partial<ChatResponse> {
  return {
    conversation_id: payload.conversation_id,
    sources: mapSSESources(payload.sources),
    documents_found: payload.files_count || payload.documents_found,
    processing_time_ms: payload.processing_time_ms,
    generation_mode: mapGenerationMode(payload.generation_mode),
    generation_mode_ui: payload.generation_mode_ui,
    cache_status: mapCacheStatus(payload.cache_status),
    files_count: payload.files_count,
    chunks_count: payload.chunks_count,
    total_pages: payload.total_pages,
    filter_applied: payload.filter_applied,
    fallback_used: payload.fallback_used,
    is_follow_up: payload.is_follow_up,
    cache_hits: payload.cache_hits,
    cache_misses: payload.cache_misses,
  }
}

// ============================================================
// SERVICE - APPEL CLASSIQUE
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
    } = request

    if (!query?.trim()) {
      throw new Error('La question est requise')
    }

    console.log(`[ChatService] Envoi vers ${RAG_ENDPOINT}`)

    const body: Record<string, unknown> = {
      query: query.trim(),
      user_id,
      org_id,
      project_id,
      conversation_id,
      stream: false,
    }

    if (generation_mode && generation_mode !== 'auto') {
      body.generation_mode = generation_mode
    }
    if (intent) body.intent = intent
    if (rewritten_query) body.rewritten_query = rewritten_query
    if (detected_documents?.length) body.detected_documents = detected_documents

    const { data, error } = await supabase.functions.invoke(RAG_ENDPOINT, { body })

    if (error) {
      console.error(`[ChatService] Erreur Edge Function:`, error)
      throw error
    }

    console.log(`[ChatService] Réponse reçue en ${data?.processing_time_ms || '?'}ms`)

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

// ============================================================
// SERVICE - STREAMING SSE (v2.2.0 - Parsing robuste)
// ============================================================

export type OnTokenCallback = (token: string) => void
export type OnStepCallback = (step: SSEStepEvent) => void
export type OnSourcesCallback = (sources: MessageSource[], metadata: Partial<ChatResponse>) => void
export type OnErrorCallback = (error: Error) => void

export interface StreamOptions {
  onToken: OnTokenCallback
  onStep?: OnStepCallback
  onSources?: OnSourcesCallback
  onError?: OnErrorCallback
  onComplete?: () => void
}

/**
 * v2.2.0: Traite un événement SSE
 */
function processSSEEvent(
  eventType: string,
  eventData: string,
  options: StreamOptions,
  timing: { firstTokenTime: number | null; startTime: number }
): void {
  try {
    const parsed = JSON.parse(eventData)
    
    switch (eventType) {
      case 'step': {
        const stepEvent: SSEStepEvent = {
          step: parsed.step,
          message: parsed.message,
          details: parsed.details,
        }
        console.log(`[ChatService] Step: ${stepEvent.step} - ${stepEvent.message}`)
        options.onStep?.(stepEvent)
        break
      }
      
      case 'token': {
        if (parsed.content) {
          if (timing.firstTokenTime === null) {
            timing.firstTokenTime = Date.now()
            const latency = timing.firstTokenTime - timing.startTime
            console.log(`[ChatService] ⚡ Premier token reçu en ${latency}ms`)
          }
          options.onToken(parsed.content)
        }
        break
      }
      
      case 'sources': {
        const sourcesPayload = parsed as SSESourcesPayload
        const mappedSources = mapSSESources(sourcesPayload.sources) || []
        const metadata = mapSSESourcesPayload(sourcesPayload)
        options.onSources?.(mappedSources, metadata)
        console.log(`[ChatService] Sources: ${mappedSources.length} documents`)
        console.log(`[ChatService] Mode: ${sourcesPayload.generation_mode_ui || sourcesPayload.generation_mode}`)
        console.log(`[ChatService] Temps total: ${sourcesPayload.processing_time_ms}ms`)
        break
      }
      
      case 'done': {
        console.log('[ChatService] Événement done reçu')
        break
      }
      
      case 'error': {
        console.error('[ChatService] Erreur SSE:', parsed.error)
        options.onError?.(new Error(parsed.error))
        break
      }
    }
  } catch (parseError) {
    console.debug('[ChatService] Parsing ignoré:', eventData.substring(0, 50))
  }
}

/**
 * Envoie un message avec streaming SSE
 * v2.2.0: Parsing ligne par ligne simplifié et robuste
 */
export async function sendMessageStream(
  request: ChatRequest,
  options: StreamOptions
): Promise<AbortController> {
  const controller = new AbortController()
  const timing = {
    startTime: Date.now(),
    firstTokenTime: null as number | null
  }

  const {
    query,
    user_id,
    org_id = null,
    project_id = null,
    conversation_id = null,
    generation_mode = 'auto',
    intent,
    rewritten_query,
    detected_documents,
  } = request

  if (!query?.trim()) {
    options.onError?.(new Error('La question est requise'))
    options.onComplete?.()
    return controller
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[ChatService] Variables d\'environnement manquantes')
    options.onError?.(new Error('Configuration manquante'))
    options.onComplete?.()
    return controller
  }

  console.log(`[ChatService] 🚀 Streaming SSE vers ${RAG_ENDPOINT}`)

  const body: Record<string, unknown> = {
    query: query.trim(),
    user_id,
    org_id,
    project_id,
    conversation_id,
    stream: true,
  }

  if (generation_mode && generation_mode !== 'auto') {
    body.generation_mode = generation_mode
  }
  if (intent) body.intent = intent
  if (rewritten_query) body.rewritten_query = rewritten_query
  if (detected_documents?.length) body.detected_documents = detected_documents

  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData?.session?.access_token

  // IIFE async pour le streaming
  ;(async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/${RAG_ENDPOINT}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      )

      const fetchTime = Date.now() - timing.startTime
      console.log(`[ChatService] 📡 Connexion établie en ${fetchTime}ms`)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur ${response.status}: ${errorText}`)
      }

      const contentType = response.headers.get('content-type')
      
      if (!contentType?.includes('text/event-stream')) {
        console.log('[ChatService] Réponse non-SSE, fallback JSON')
        const data = await response.json()
        const mappedData = mapResponse(data as RawChatResponse)
        options.onToken(mappedData.response)
        options.onSources?.(mappedData.sources || [], mappedData)
        options.onComplete?.()
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Impossible de lire le stream')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let currentEventType: string | null = null

      // Boucle de lecture
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          console.log('[ChatService] ✅ Stream terminé')
          break
        }

        // Décoder le chunk reçu
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        // Traiter ligne par ligne
        const lines = buffer.split('\n')
        
        // Garder la dernière ligne (potentiellement incomplète) dans le buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          
          // Ligne vide = fin d'événement, reset
          if (trimmedLine === '') {
            currentEventType = null
            continue
          }
          
          // Ligne "event: xxx"
          if (trimmedLine.startsWith('event:')) {
            currentEventType = trimmedLine.substring(6).trim()
            continue
          }
          
          // Ligne "data: xxx"
          if (trimmedLine.startsWith('data:') && currentEventType) {
            const eventData = trimmedLine.substring(5).trim()
            processSSEEvent(currentEventType, eventData, options, timing)
          }
        }
      }

      // Traiter le reste du buffer si non vide
      if (buffer.trim()) {
        const remainingLines = buffer.split('\n')
        for (const line of remainingLines) {
          const trimmedLine = line.trim()
          if (trimmedLine.startsWith('data:') && currentEventType) {
            const eventData = trimmedLine.substring(5).trim()
            processSSEEvent(currentEventType, eventData, options, timing)
          }
        }
      }

      const totalTime = Date.now() - timing.startTime
      console.log(`[ChatService] 🏁 Durée totale: ${totalTime}ms`)
      
      options.onComplete?.()

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('[ChatService] Stream annulé')
      } else {
        console.error('[ChatService] Erreur streaming:', error)
        options.onError?.(error as Error)
      }
      options.onComplete?.()
    }
  })()

  return controller
}

// ============================================================
// EXPORT PAR DÉFAUT
// ============================================================

export default {
  sendMessage,
  sendMessageStream,
}
