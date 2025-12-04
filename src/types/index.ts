// Types pour l'application ARPET (ex-Léa)

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
  vertical_id?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  business_role: string;
  app_role: string;
  org_id: string;
  vertical_id: string;
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
export type KnowledgeType = 'shared' | 'personal' | 'global' | 'new';
export type AgentSource = 'librarian' | 'analyst' | 'user';

export interface MessageSource {
  document_id: string;
  document_name?: string;
  chunk_id?: string;
  score?: number;
}

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

  // État UI
  isStreaming?: boolean;
  isAnchored?: boolean;
}

// ============================================
// BAC À SABLE (SANDBOX) - Supabase
// ============================================
export type SandboxItemType =
  | 'conversation'
  | 'analysis'
  | 'note'
  | 'comparison'
  | 'extract';

// IMPORTANT: 'validated' devient 'pinned' pour correspondre au schéma Supabase
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
  // Contexte initial
  objective: string;
  initial_prompt: string;
  
  // Conversation sandbox (avec mémoire)
  messages: SandboxMessage[];
  
  // Résultat actuel
  display: SandboxDisplay;
  
  // Routine agent (peut être null si pas encore définie)
  routine: SandboxRoutine | null;
}

/** Sandbox Item complet (depuis Supabase) */
export interface SandboxItem {
  id: string;
  
  // Contexte (cloisonnement)
  vertical_id: string;
  org_id: string;
  user_id: string;
  project_id: string | null;
  
  // Contenu
  title: string;
  content: SandboxContent;
  
  // Workflow
  status: SandboxItemStatus;
  visibility: SandboxVisibility;
  
  // Traçabilité
  source_qa_id: string | null;
  
  // Timestamps
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
  authority_label: 'user' | 'team';
  target_verticals?: string[];
  target_projects?: string[];
  validators_ids?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
}

// ============================================
// HELPERS
// ============================================

/** Génère un content vide pour un nouveau sandbox */
export function createEmptySandboxContent(
  objective: string,
  initialPrompt: string = ''
): SandboxContent {
  return {
    objective,
    initial_prompt: initialPrompt || objective,
    messages: [],
    display: {
      result_type: null,
      result_data: null,
      last_run_at: null,
    },
    routine: null,
  };
}
