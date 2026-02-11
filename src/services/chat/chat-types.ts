// ============================================================
// ARPET - Chat Service Types
// ============================================================

import type {
  MessageSource,
  KnowledgeType,
  AgentSource,
  VoteContext
} from '../../types'

// ============================================================
// CONFIGURATION — RAG Endpoint (fixe : baikal-retrieval)
// ============================================================

// Endpoint unique validé après A/B testing (v1.4.0).
// Re-exports pour rétro-compatibilité des imports existants.
export { getRagBackend as RAG_BACKEND_FN, getRagEndpoint as RAG_ENDPOINT_FN } from './chat-config'
export { type RagBackend } from './chat-config'

// Compat statique (fallback pour les imports legacy)
export const RAG_ENDPOINT = 'baikal-retrieval'

// ============================================================
// SUGGESTIONS CONTEXTUELLES
// ============================================================

export interface SuggestionItem {
  text: string
  source_hint: string
}

// ============================================================
// REQUEST / RESPONSE
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
  enable_suggestions?: boolean
}

export interface RawChatResponse {
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
    page?: number
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
  cache_type?: string
  answer_format?: string
  timings?: Record<string, number>
}

export interface ChatResult {
  data: ChatResponse | null
  error: Error | null
}

// ============================================================
// SSE TYPES
// ============================================================

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

export interface SSESourcesPayload {
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
    page?: number
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

export type OnTokenCallback = (token: string) => void
export type OnStepCallback = (step: SSEStepEvent) => void
export type OnSourcesCallback = (sources: MessageSource[], metadata: Partial<ChatResponse>) => void
export type OnSuggestionsCallback = (suggestions: SuggestionItem[]) => void
export type OnErrorCallback = (error: Error) => void

export interface StreamOptions {
  onToken: OnTokenCallback
  onStep?: OnStepCallback
  onSources?: OnSourcesCallback
  onSuggestions?: OnSuggestionsCallback
  onError?: OnErrorCallback
  onComplete?: () => void
}
