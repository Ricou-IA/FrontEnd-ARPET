// ============================================
// QA MEMORY (v6)
// ============================================

/**
 * Authority labels pour qa_memory (v6)
 */
export type AuthorityLabel = 'user' | 'team' | 'expert' | 'flagged';

/**
 * Types de sources (v6 - avec qa_memory)
 */
export type SourceType = 'document' | 'qa_memory' | 'meeting';

/**
 * QA Memory entry
 */
export interface QAMemory {
  id: string;
  org_id: string;
  project_id: string | null;
  question_text: string;
  answer_text: string;
  embedding?: number[];
  is_expert_faq: boolean;
  expert_source: string | null;
  trust_score: number;
  validators_ids: string[];
  source_file_ids: string[] | null;
  usage_count: number;
  last_accessed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
