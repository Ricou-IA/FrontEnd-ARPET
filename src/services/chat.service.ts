// ============================================================
// ARPET - Chat Service
// Version: 3.0.0 - Toggle v2/v3
// Date: 2025-01-15
// ============================================================

import { supabase } from '../lib/supabase'
import type {
  MessageSource,
  KnowledgeType,
  AgentSource,
  VoteContext
} from '../types'

// ============================================================
// CONFIGURATION - TOGGLE v2/v3
// ============================================================

const RAG_ENDPOINTS = {
  v2: 'baikal-brain',
  v3: 'baikal-brain-v3',
} as const

type RagVersion = keyof typeof RAG_ENDPOINTS

// Clé localStorage pour persister le choix
const RAG_VERSION_KEY = 'arpet_rag_version'

// État actuel (initialisé depuis localStorage ou défaut v2)
let currentVersion: RagVersion = (localStorage.getItem(RAG_VERSION_KEY) as RagVersion) || 'v2'

/**
 * Récupère la version RAG actuelle
 */
export function getRagVersion(): RagVersion {
  return currentVersion
}

/**
 * Change la version RAG (v2 ou v3)
 */
export function setRagVersion(version: RagVersion): void {
  currentVersion = version
  localStorage.setItem(RAG_VERSION_KEY, version)
  console.log(`[ChatService] 🔄 Version RAG changée: ${version} → ${RAG_ENDPOINTS[version]}`)
}

/**
 * Toggle entre v2 et v3
 */
export function toggleRagVersion(): RagVersion {
  const newVersion = currentVersion === 'v2' ? 'v3' : 'v2'
  setRagVersion(newVersion)
  return newVersion
}

/**
 * Récupère l'endpoint actuel
 */
function getEndpoint(): string {
  return RAG_ENDPOINTS[currentVersion]
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

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
  // v3: Nouveaux champs
  cache_type?: string
  answer_format?: string
  timings?: Record<string, number>
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
  // v3: Nouveaux champs
  cache_type?: string
  answer_format?: string
  timings?: Record<string, number>
  rag_version?: RagVersion
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
  cache_type?: string
  cache_reused?: boolean
  intent?: string | null
  answer_format?: string
  query_rewritten?: boolean
  timings?: Record<string, number>
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
    // v3
    cache_type: raw.cache_type,
    answer_format: raw.answer_format,
    timings: raw.timings,
    rag_version: currentVersion,
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
    // v3
    cache_type: payload.cache_type,
    answer_format: payload.answer_format,
    timings: payload.timings,
    rag_version: currentVersion,
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

    const endpoint = getEndpoint()
    console.log(`[ChatService] Envoi vers ${endpoint} (${currentVersion})`)

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

    const { data, error } = await supabase.functions.invoke(endpoint, { body })

    if (error) {
      console.error(`[ChatService] Erreur Edge Function:`, error)
      throw error
    }

    console.log(`[ChatService] Réponse reçue en ${data?.processing_time_ms || '?'}ms (${currentVersion})`)

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
// SERVICE - STREAMING SSE
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
 * Traite un événement SSE
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
            console.log(`[ChatService] ⚡ Premier token reçu en ${latency}ms (${currentVersion})`)
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
        // v3: Afficher le type de cache
        if (sourcesPayload.cache_type) {
          console.log(`[ChatService] Cache: ${sourcesPayload.cache_type} (reused=${sourcesPayload.cache_reused})`)
        }
        if (sourcesPayload.timings) {
          console.log(`[ChatService] Timings:`, sourcesPayload.timings)
        }
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

  const endpoint = getEndpoint()
  console.log(`[ChatService] 🚀 Streaming SSE vers ${endpoint} (${currentVersion})`)

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
    ; (async () => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/${endpoint}`,
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
        console.log(`[ChatService] 📡 Connexion établie en ${fetchTime}ms (${currentVersion})`)

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
        console.log(`[ChatService] 🏁 Durée totale: ${totalTime}ms (${currentVersion})`)

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
  getRagVersion,
  setRagVersion,
  toggleRagVersion,
}
