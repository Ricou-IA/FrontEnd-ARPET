// ============================================
// CHAT & MESSAGES
// ============================================

import type { AuthorityLabel, SourceType } from './qa-memory.types';

export type MessageRole = 'user' | 'assistant';

/**
 * Types de connaissance étendus (v6 - avec mémoire)
 */
export type KnowledgeType =
  | 'none'              // Aucun document trouvé
  | 'shared'            // Documents partagés (général)
  | 'organization'      // Documents de l'organisation
  | 'project'           // Documents du projet
  | 'personal'          // Documents de l'utilisateur
  | 'global'            // Global (rétro-compat)
  | 'new'               // Nouvelle réponse (rétro-compat)
  | 'team_validated'    // Réponse validée par l'équipe (≥3 votes)
  | 'expert_validated'  // FAQ Expert pré-enregistrée
  | 'memory';           // v6: Réponse depuis mémoire collective

export type AgentSource = 'librarian' | 'analyst' | 'user';

/**
 * v6.0.1: Mode de génération (inclut memory)
 */
export type GenerationMode = 'chunks' | 'gemini' | 'hybrid' | 'memory';

/**
 * Source de message (v6 - rétro-compatible)
 */
export interface MessageSource {
  // Identifiants
  id?: string | number;
  type?: SourceType;
  source_file_id?: string | null;  // v6.0.1: Accepte undefined et null

  // Affichage
  document_name?: string;
  name?: string;
  content_preview?: string | null;
  score?: number;
  layer?: string;

  // Navigation document
  page?: number;

  // Rétro-compat
  document_id?: string;
  chunk_id?: string;

  // QA Memory spécifique
  authority_label?: AuthorityLabel;
  qa_id?: string;
}

/**
 * v6.0.1: Contexte pour voter sur une nouvelle réponse (rétro-compat)
 */
export interface VoteContext {
  question: string;
  answer: string;
  source_ids: (string | undefined)[];  // Rétro-compat avec code existant
}

/**
 * Message (v6 - avec mémoire collective)
 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;

  // Metadata pour les réponses de l'assistant
  knowledge_type?: KnowledgeType;
  validation_count?: number;
  sources?: MessageSource[];
  agent_source?: AgentSource;

  // Infos retrieval
  documents_found?: number;
  qa_memory_found?: number;
  processing_time_ms?: number;
  prompt_used?: string;
  prompt_resolution?: string;

  // RAG Badge metadata
  generation_mode?: GenerationMode;
  generation_mode_ui?: string;  // "Full Document", "RAG Chunks", "Mémoire Collective"
  cache_status?: 'hit' | 'miss' | 'none';

  // =============================================
  // v6: MÉMOIRE COLLECTIVE
  // =============================================

  /** true si la réponse vient de qa_memory (pas de RAG) */
  from_memory?: boolean;

  /** ID de la qa_memory utilisée (si from_memory=true) ou créée (après vote) */
  qa_memory_id?: string | null;

  /** Similarité du match mémoire (0-1) */
  qa_memory_similarity?: number;

  /** true si FAQ Expert */
  qa_memory_is_expert?: boolean;

  /** Score de confiance (nombre de votes positifs) */
  qa_memory_trust_score?: number;

  // =============================================
  // SYSTÈME DE VOTE
  // =============================================

  /** true si l'utilisateur peut voter sur cette réponse */
  can_vote?: boolean;

  /** Contexte pour créer une qa_memory lors du vote (si from_memory=false) */
  vote_context?: VoteContext;

  /** Vote de l'utilisateur courant sur ce message */
  user_vote?: 'up' | 'down' | null;

  // =============================================
  // SUGGESTIONS CONTEXTUELLES
  // =============================================

  /** Questions de suivi suggérées par le backend */
  suggestions?: Array<{
    text: string
    source_hint: string
  }>;

  // État UI
  isStreaming?: boolean;
}

// ============================================
// RÉPONSE API LIBRARIAN (v2)
// ============================================

export interface LibrarianResponse {
  response: string;
  sources: MessageSource[];
  knowledge_type: KnowledgeType;
  status: 'success' | 'error';
  processing_time_ms: number;
  documents_found: number;
  qa_memory_found: number;
  model: string;
  embedding_model: string;
  prompt_used: string;
  prompt_resolution: string;
  app_id: string | null;
  can_vote: boolean;
  vote_context?: VoteContext;
  error?: string;
}

// ============================================
// VOTE (v6)
// ============================================

export interface VoteResult {
  success: boolean;
  action: string;
  qa_id: string | null;
  trust_score: number;
  message: string;
  error?: string;
}
