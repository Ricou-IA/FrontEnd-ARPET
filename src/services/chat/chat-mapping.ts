// ============================================================
// ARPET - Chat Mapping Helpers
// ============================================================

import type {
  MessageSource,
  KnowledgeType,
  AgentSource,
  VoteContext
} from '../../types'
import type {
  RawChatResponse,
  ChatResponse,
  SSESourcesPayload,
} from './chat-types'

// ============================================================
// MAPPING DES TYPES
// ============================================================

export function mapSources(rawSources?: RawChatResponse['sources']): MessageSource[] | undefined {
  if (!rawSources || rawSources.length === 0) return undefined

  return rawSources.map(source => ({
    id: source.id,
    type: source.type === 'document' || source.type === 'qa_memory' || source.type === 'meeting'
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
    page: source.page,
  }))
}

export function mapSSESources(rawSources?: SSESourcesPayload['sources']): MessageSource[] | undefined {
  if (!rawSources || rawSources.length === 0) return undefined

  return rawSources.map(source => ({
    id: source.id?.toString(),
    type: source.type === 'document' || source.type === 'qa_memory' || source.type === 'meeting'
      ? source.type
      : 'document',
    source_file_id: source.source_file_id || undefined,
    document_name: source.document_name,
    name: source.name,
    score: source.score,
    content_preview: source.content_preview || undefined,
    chunk_id: source.chunk_id?.toString(),
    page: source.page,
  }))
}

export function mapCacheStatus(status?: string | null): 'hit' | 'miss' | 'none' | undefined {
  if (!status) return undefined
  if (status === 'hit') return 'hit'
  if (status === 'miss' || status === 'partial') return 'miss'
  return 'none'
}

export function mapGenerationMode(mode?: string): 'chunks' | 'gemini' | 'hybrid' | undefined {
  if (!mode) return undefined
  if (mode === 'chunks' || mode === 'gemini' || mode === 'hybrid') return mode
  // baikal-retrieval renvoie aussi 'memory' et 'conversational' → mapper vers chunks pour le frontend
  if (mode === 'memory' || mode === 'conversational') return 'chunks'
  return 'chunks'
}

export function mapKnowledgeType(type?: string): KnowledgeType | undefined {
  if (!type) return undefined
  const validTypes: KnowledgeType[] = [
    'none', 'shared', 'organization', 'project', 'personal',
    'global', 'new', 'team_validated', 'expert_validated'
  ]
  return validTypes.includes(type as KnowledgeType)
    ? (type as KnowledgeType)
    : 'shared'
}

export function mapAgentSource(source?: string): AgentSource | undefined {
  if (!source) return undefined
  if (source === 'librarian' || source === 'analyst' || source === 'user') {
    return source
  }
  return 'librarian'
}

export function mapVoteContext(context?: RawChatResponse['vote_context']): VoteContext | undefined {
  if (!context) return undefined
  return {
    question: context.question,
    answer: context.answer,
    source_ids: context.source_ids.filter((id): id is string => id !== undefined),
  }
}

export function mapResponse(raw: RawChatResponse): ChatResponse {
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
    analysis: raw.analysis
      ? {
          intent: raw.analysis.intent,
          rewritten_query: raw.analysis.rewritten_query,
          detected_documents: raw.analysis.detected_documents,
          reasoning: raw.analysis.reasoning,
        }
      : undefined,
    cache_type: raw.cache_type,
    answer_format: raw.answer_format,
    timings: raw.timings,
  }
}

export function mapSSESourcesPayload(payload: SSESourcesPayload): Partial<ChatResponse> {
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
    cache_type: payload.cache_type,
    answer_format: payload.answer_format,
    timings: payload.timings,
  }
}
