// ============================================================
// ARPET - Types Sandbox Items
// Version: 1.0.0
// Date: 2025-12-04
// ============================================================

// ============================================================
// TYPES DE BASE
// ============================================================

export type SandboxStatus = 'draft' | 'pinned' | 'archived';
export type SandboxVisibility = 'private' | 'project' | 'org';
export type MessageRole = 'user' | 'agent';
export type ResultType = 'table' | 'chart' | 'number' | 'text';

// ============================================================
// STRUCTURE DU CONTENT (JSONB)
// ============================================================

/** Message dans la conversation sandbox */
export interface SandboxMessage {
  role: MessageRole;
  text: string;
  at: string; // ISO 8601
}

/** Données affichées à l'utilisateur */
export interface SandboxDisplay {
  result_type: ResultType | null;
  result_data: unknown; // Flexible selon result_type
  last_run_at: string | null; // ISO 8601
}

/** Paramètres de la routine agent */
export interface RoutineParams {
  fixed: Record<string, unknown>;   // Paramètres constants
  dynamic: Record<string, unknown>; // Paramètres recalculés à chaque run
}

/** Step de la routine agent */
export interface RoutineStep {
  action: string;
  target?: string;
  operation?: string;
  field?: string;
  filter?: Record<string, unknown>;
  threshold?: number;
  [key: string]: unknown; // Extensible
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

// ============================================================
// ENTITÉ PRINCIPALE
// ============================================================

/** Sandbox Item complet (depuis la DB) */
export interface SandboxItem {
  id: string;
  
  // Contexte
  vertical_id: string;
  org_id: string;
  user_id: string;
  project_id: string | null;
  
  // Contenu
  title: string;
  content: SandboxContent;
  
  // Workflow
  status: SandboxStatus;
  visibility: SandboxVisibility;
  
  // Traçabilité
  source_qa_id: string | null;
  
  // Timestamps
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// ============================================================
// TYPES POUR LES OPÉRATIONS CRUD
// ============================================================

/** Création d'un nouveau sandbox item */
export interface SandboxItemCreate {
  title: string;
  project_id?: string | null;
  content?: Partial<SandboxContent>;
  source_qa_id?: string | null;
}

/** Mise à jour d'un sandbox item */
export interface SandboxItemUpdate {
  title?: string;
  content?: Partial<SandboxContent>;
  project_id?: string | null;
}

// ============================================================
// TYPES POUR L'UI
// ============================================================

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
  canRefresh: boolean; // true si routine existe
}

// ============================================================
// HELPERS POUR TRANSFORMER LES DONNÉES
// ============================================================

/** Transforme un SandboxItem en SandboxDraftCard pour l'UI */
export function toSandboxDraftCard(item: SandboxItem): SandboxDraftCard {
  const messages = item.content.messages || [];
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  
  return {
    id: item.id,
    title: item.title,
    objective: item.content.objective || '',
    lastMessage: lastUserMessage?.text || null,
    messagesCount: messages.length,
    hasResult: item.content.display?.result_data != null,
    updatedAt: new Date(item.updated_at),
  };
}

/** Transforme un SandboxItem en WorkspaceWidget pour l'UI */
export function toWorkspaceWidget(item: SandboxItem): WorkspaceWidget {
  return {
    id: item.id,
    title: item.title,
    resultType: item.content.display?.result_type || null,
    resultData: item.content.display?.result_data || null,
    lastRunAt: item.content.display?.last_run_at 
      ? new Date(item.content.display.last_run_at) 
      : null,
    canRefresh: item.content.routine != null,
  };
}

// ============================================================
// CONTENT PAR DÉFAUT (pour création)
// ============================================================

/** Génère un content vide pour un nouveau sandbox */
export function createEmptyContent(
  objective: string, 
  initialPrompt: string
): SandboxContent {
  return {
    objective,
    initial_prompt: initialPrompt,
    messages: [],
    display: {
      result_type: null,
      result_data: null,
      last_run_at: null,
    },
    routine: null,
  };
}

/** Ajoute un message à un content existant */
export function addMessage(
  content: SandboxContent,
  role: MessageRole,
  text: string
): SandboxContent {
  return {
    ...content,
    messages: [
      ...content.messages,
      {
        role,
        text,
        at: new Date().toISOString(),
      },
    ],
  };
}

/** Met à jour le display d'un content */
export function updateDisplay(
  content: SandboxContent,
  resultType: ResultType,
  resultData: unknown
): SandboxContent {
  return {
    ...content,
    display: {
      result_type: resultType,
      result_data: resultData,
      last_run_at: new Date().toISOString(),
    },
  };
}