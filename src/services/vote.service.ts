// ============================================================
// ARPET - Vote Service
// Version: 3.0.0 - Refonte Phase 6 : Edge Function baikal-vote
// Date: 2024-12-31
// ============================================================
// 
// Ce service appelle l'Edge Function baikal-vote pour gérer
// les votes sur les réponses (mémoire collective).
//
// Actions disponibles:
// - voteUpNew: Nouvelle réponse RAG → crée qa_memory + premier vote
// - voteUpExisting: Réponse depuis mémoire → incrémente trust_score
// - voteDown: Signaler une réponse incorrecte → décrémente trust_score
//
// ============================================================

import { supabase } from '@/lib/supabase';

// ============================================================
// TYPES
// ============================================================

export interface VoteResult {
  success: boolean;
  action: string;
  qa_id: string | null;
  trust_score: number;
  message: string;
  error?: string;
}

export interface VoteUpNewParams {
  question: string;
  answer: string;
  org_id: string;
  project_id?: string | null;
  source_file_ids?: string[];
}

// ============================================================
// HELPER: Récupérer l'utilisateur courant
// ============================================================

async function getCurrentUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  return user.id;
}

// ============================================================
// VOTE UP NEW - Nouvelle réponse (crée qa_memory)
// ============================================================

/**
 * Vote positif sur une nouvelle réponse RAG (pas encore en mémoire)
 * Crée une entrée qa_memory avec embedding + premier vote
 * 
 * @param params - Question, réponse, org_id, project_id (optionnel), source_file_ids (optionnel)
 * @returns VoteResult avec qa_id de la nouvelle entrée
 */
export async function voteUpNew(params: VoteUpNewParams): Promise<VoteResult> {
  try {
    const userId = await getCurrentUserId();
    
    console.log('[vote.service] voteUpNew:', params.question.substring(0, 50) + '...');

    const { data, error } = await supabase.functions.invoke('baikal-vote', {
      body: {
        action: 'vote_up_new',
        user_id: userId,
        question: params.question,
        answer: params.answer,
        org_id: params.org_id,
        project_id: params.project_id || null,
        source_file_ids: params.source_file_ids || null,
      }
    });

    if (error) {
      console.error('[vote.service] voteUpNew error:', error);
      return {
        success: false,
        action: 'vote_up_new',
        qa_id: null,
        trust_score: 0,
        message: 'Erreur lors de la validation',
        error: error.message,
      };
    }

    console.log('[vote.service] voteUpNew success:', data);
    return data as VoteResult;
    
  } catch (err) {
    console.error('[vote.service] voteUpNew exception:', err);
    return {
      success: false,
      action: 'vote_up_new',
      qa_id: null,
      trust_score: 0,
      message: 'Erreur inattendue',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============================================================
// VOTE UP EXISTING - Réponse déjà en mémoire
// ============================================================

/**
 * Vote positif sur une réponse déjà en mémoire collective
 * Incrémente trust_score (si pas déjà voté)
 * 
 * @param qaId - ID de la qa_memory existante
 * @returns VoteResult avec nouveau trust_score
 */
export async function voteUpExisting(qaId: string): Promise<VoteResult> {
  try {
    const userId = await getCurrentUserId();
    
    console.log('[vote.service] voteUpExisting:', qaId);

    const { data, error } = await supabase.functions.invoke('baikal-vote', {
      body: {
        action: 'vote_up_existing',
        user_id: userId,
        qa_id: qaId,
      }
    });

    if (error) {
      console.error('[vote.service] voteUpExisting error:', error);
      return {
        success: false,
        action: 'vote_up_existing',
        qa_id: qaId,
        trust_score: 0,
        message: 'Erreur lors du vote',
        error: error.message,
      };
    }

    console.log('[vote.service] voteUpExisting success:', data);
    return data as VoteResult;
    
  } catch (err) {
    console.error('[vote.service] voteUpExisting exception:', err);
    return {
      success: false,
      action: 'vote_up_existing',
      qa_id: qaId,
      trust_score: 0,
      message: 'Erreur inattendue',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============================================================
// VOTE DOWN - Signaler une réponse incorrecte
// ============================================================

/**
 * Vote négatif sur une réponse en mémoire collective
 * Décrémente trust_score
 * 
 * @param qaId - ID de la qa_memory à signaler
 * @returns VoteResult avec nouveau trust_score
 */
export async function voteDown(qaId: string): Promise<VoteResult> {
  try {
    const userId = await getCurrentUserId();
    
    console.log('[vote.service] voteDown:', qaId);

    const { data, error } = await supabase.functions.invoke('baikal-vote', {
      body: {
        action: 'vote_down',
        user_id: userId,
        qa_id: qaId,
      }
    });

    if (error) {
      console.error('[vote.service] voteDown error:', error);
      return {
        success: false,
        action: 'vote_down',
        qa_id: qaId,
        trust_score: 0,
        message: 'Erreur lors du signalement',
        error: error.message,
      };
    }

    console.log('[vote.service] voteDown success:', data);
    return data as VoteResult;
    
  } catch (err) {
    console.error('[vote.service] voteDown exception:', err);
    return {
      success: false,
      action: 'vote_down',
      qa_id: qaId,
      trust_score: 0,
      message: 'Erreur inattendue',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
