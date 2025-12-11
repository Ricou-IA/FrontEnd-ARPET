// ============================================================
// ARPET - Types unifiés v3.0
// Version: 3.0.0 - Migration schémas DB (vertical → app)
// Date: 2025-12-11
// ============================================================

// ============================================
// UTILISATEUR & AUTH
// ============================================
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  org_id?: string;
  app_id?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  business_role: string;
  app_role: string;
  org_id: string;
  app_id: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// ORGANISATION & PROJETS (CHANTIERS)
// ============================================
export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  org_id: string;
  description?: string;
  status?: 'active' | 'completed' | 'archived';
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

// ============================================
// CHAT & MESSAGES
// ============================================
export type MessageRole = 'user' | 'assistant';

// Types de connaissance étendus (v2)
export type KnowledgeType = 
  | 'none'              // Aucun document trouvé
  | 'shared'            // Documents partagés (général)
  | 'organization'      // Documents de l'organisation
  | 'project'           // Documents du projet
  | 'personal'          // Documents de l'utilisateur
  | 'global'            // Global (rétro-compat)
  | 'new'               // Nouvelle réponse (rétro-compat)
  | 'team_validated'    // Réponse validée par l'équipe (≥2 votes)
  | 'expert_validated'; // Réponse validée par experts (≥5 votes)

export type AgentSource = 'librarian' | 'analyst' | 'user';

// Types de sources (v2)
export type SourceType = 'document' | 'qa_memory';

// Authority labels pour qa_memory (v2)
export type AuthorityLabel = 'user' | 'team' | 'expert' | 'flagged';

// Source de message (v2 - rétro-compatible)
export interface MessageSource {
  // Champs existants (rétro-compat)
  document_id?: string;
  document_name?: string;
  chunk_id?: string;
  score?: number;
  // Nouveaux champs v2
  id?: string;
  type?: SourceType;
  name?: string;
  content_preview?: string;
  authority_label?: AuthorityLabel;
  qa_id?: string;
}

// Contexte de vote (v2)
export interface VoteContext {
  question: string;
  answer: string;
  source_ids: string[];
}

// Message (v2 - rétro-compatible)
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
  
  // Nouveaux champs v2
  documents_found?: number;
  qa_memory_found?: number;
  processing_time_ms?: number;
  prompt_used?: string;
  prompt_resolution?: string;

  // Système de vote (v2)
  can_vote?: boolean;
  vote_context?: VoteContext;
  user_vote?: 'up' | 'down' | null;

  // État UI
  isStreaming?: boolean;
  isAnchored?: boolean;
  sandboxItemId?: string;  // ID du sandbox item si ancré
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
// QA MEMORY (Knowledge Hub)
// ============================================
export interface QAMemory {
  id: string;
  org_id: string;
  document_id?: number;
  question_text: string;
  answer_text: string;
  trust_score: number;
  usage_count: number;
  authority_label: AuthorityLabel;
  target_apps?: string[];
  target_projects?: string[];
  validators_ids?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
  flagged_at?: string | null;
  flagged_by?: string | null;
}

// Résultat d'un vote (v2)
export interface VoteResult {
  success: boolean;
  error?: 'ALREADY_VOTED' | 'QA_NOT_FOUND' | string;
  message: string;
  new_score?: number;
  new_label?: AuthorityLabel;
}

// ============================================
// BAC À SABLE (SANDBOX) - Types de base
// ============================================
export type SandboxItemStatus = 'draft' | 'pinned' | 'archived';
export type SandboxVisibility = 'private' | 'project' | 'org';
export type ResultType = 'table' | 'chart' | 'number' | 'text';

/** Message dans la conversation sandbox */
export interface SandboxMessage {
  role: 'user' | 'agent';
  text: string;
  at: string; // ISO 8601
}

/** Données affichées à l'utilisateur */
export interface SandboxDisplay {
  result_type: ResultType | null;
  result_data: unknown;
  last_run_at: string | null;
}

/** Paramètres de la routine agent */
export interface RoutineParams {
  fixed: Record<string, unknown>;
  dynamic: Record<string, unknown>;
}

/** Step de la routine agent */
export interface RoutineStep {
  action: string;
  target?: string;
  operation?: string;
  field?: string;
  filter?: Record<string, unknown>;
  threshold?: number;
  [key: string]: unknown;
}

/** Routine complète de l'agent */
export interface SandboxRoutine {
  version: number;
  steps: RoutineStep[];
  params: RoutineParams;
}

/** Structure complète du content JSONB */
export interface SandboxContent {
  objective: string;
  initial_prompt: string;
  messages: SandboxMessage[];
  display: SandboxDisplay;
  routine: SandboxRoutine | null;
}

/** Sandbox Item complet (depuis Supabase) */
export interface SandboxItem {
  id: string;
  app_id: string;
  org_id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  content: SandboxContent;
  status: SandboxItemStatus;
  visibility: SandboxVisibility;
  source_qa_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Pour créer un nouveau sandbox item */
export interface SandboxItemCreate {
  title: string;
  project_id?: string | null;
  content?: Partial<SandboxContent>;
  source_qa_id?: string | null;
}

/** Pour mettre à jour un sandbox item */
export interface SandboxItemUpdate {
  title?: string;
  content?: Partial<SandboxContent>;
  project_id?: string | null;
}

// ============================================
// TYPES UI POUR LE SANDBOX
// ============================================

/** Item affiché dans le Bac à Sable (drafts) */
export interface SandboxDraftCard {
  id: string;
  title: string;
  objective: string;
  lastMessage: string | null;
  messagesCount: number;
  hasResult: boolean;
  updatedAt: Date;
}

/** Widget affiché dans l'Espace de Travail (pinned) */
export interface WorkspaceWidget {
  id: string;
  title: string;
  resultType: ResultType | null;
  resultData: unknown;
  lastRunAt: Date | null;
  canRefresh: boolean;
}

// ============================================
// HELPERS
// ============================================

/**
 * Crée un contenu sandbox vide
 */
export function createEmptySandboxContent(
  title: string = 'Nouveau',
  objective: string = ''
): SandboxContent {
  return {
    objective,
    initial_prompt: title,
    messages: [],
    display: {
      result_type: null,
      result_data: null,
      last_run_at: null,
    },
    routine: null,
  };
}

/**
 * Vérifie si une source est une qa_memory validée
 */
export function isValidatedSource(source: MessageSource): boolean {
  return source.type === 'qa_memory' && 
         (source.authority_label === 'team' || source.authority_label === 'expert');
}

/**
 * Retourne le badge à afficher selon l'authority_label
 */
export function getAuthorityBadge(label?: AuthorityLabel): { text: string; color: string } | null {
  switch (label) {
    case 'expert':
      return { text: '⭐ Expert', color: 'text-amber-600 bg-amber-50' };
    case 'team':
      return { text: '✓ Équipe', color: 'text-green-600 bg-green-50' };
    case 'user':
      return { text: 'Utilisateur', color: 'text-blue-600 bg-blue-50' };
    case 'flagged':
      return { text: '⚠ Signalé', color: 'text-red-600 bg-red-50' };
    default:
      return null;
  }
}

/**
 * Retourne l'icône selon le knowledge_type
 */
export function getKnowledgeTypeIcon(type?: KnowledgeType): string {
  switch (type) {
    case 'expert_validated':
      return '⭐';
    case 'team_validated':
      return '✓';
    case 'personal':
      return '👤';
    case 'project':
      return '🏗️';
    case 'organization':
      return '🏢';
    case 'shared':
    case 'global':
      return '📚';
    case 'new':
      return '✨';
    case 'none':
      return '❓';
    default:
      return '📄';
  }
}

/**
 * Formate un score de similarité en pourcentage
 */
export function formatScore(score?: number): string {
  if (score === undefined || score === null) return '';
  return `${Math.round(score * 100)}%`;
}
