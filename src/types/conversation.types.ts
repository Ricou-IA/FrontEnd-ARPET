// ============================================
// CONVERSATIONS SAUVEGARDÉES (v4.0.0)
// ============================================

import type { Message } from './chat.types';

/**
 * Conversation sauvegardée (table arpet.saved_conversations)
 */
export interface SavedConversation {
  id: string;
  app_id: string;
  org_id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  messages: Message[];
  source_qa_id: string | null;
  rag_conversation_id?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Pour créer une nouvelle conversation sauvegardée
 */
export interface SavedConversationCreate {
  title: string;
  messages: Message[];
  project_id?: string | null;
  source_qa_id?: string | null;
}
