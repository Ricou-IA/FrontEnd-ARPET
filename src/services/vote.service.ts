// ============================================================
// ARPET - Vote Service
// Version: 1.0.1 - Fix: qa_memory créée au niveau Organisation
// Date: 2025-01-XX
// ============================================================

import { supabase } from '@/lib/supabase';
import type { VoteResult, VoteContext } from '@/types';

// ============================================================
// TYPES
// ============================================================

interface CreateQAMemoryParams {
  question_text: string;
  answer_text: string;
  source_document_ids?: string[];
  org_id: string;
  // Note: target_verticals retiré - qa_memory toujours au niveau org
  target_projects?: string[];
}

// ============================================================
// VOTE POUR UNE RÉPONSE EXISTANTE
// ============================================================

/**
 * Vote positif pour une qa_memory existante
 * Incrémente trust_score et peut promouvoir authority_label
 */
export async function voteUp(qaId: string): Promise<VoteResult> {
  try {
    const { data, error } = await supabase.rpc('vote_for_answer', {
      p_row_id: qaId
    });

    if (error) {
      console.error('voteUp error:', error);
      
      // Gérer le cas "déjà voté"
      if (error.message?.includes('already voted') || error.code === 'P0001') {
        return {
          success: false,
          error: 'ALREADY_VOTED',
          message: 'Vous avez déjà voté pour cette réponse'
        };
      }
      
      return {
        success: false,
        error: error.message,
        message: 'Erreur lors du vote'
      };
    }

    return {
      success: true,
      message: 'Vote enregistré',
      new_score: data?.new_score,
      new_label: data?.new_label
    };
  } catch (err) {
    console.error('voteUp exception:', err);
    return {
      success: false,
      error: String(err),
      message: 'Erreur inattendue'
    };
  }
}

/**
 * Vote négatif pour une qa_memory
 * Décrémente trust_score et peut flaguer la réponse
 */
export async function voteDown(qaId: string): Promise<VoteResult> {
  try {
    const { data, error } = await supabase.rpc('invalidate_answer', {
      p_row_id: qaId
    });

    if (error) {
      console.error('voteDown error:', error);
      
      if (error.message?.includes('already voted') || error.code === 'P0001') {
        return {
          success: false,
          error: 'ALREADY_VOTED',
          message: 'Vous avez déjà signalé cette réponse'
        };
      }
      
      return {
        success: false,
        error: error.message,
        message: 'Erreur lors du signalement'
      };
    }

    return {
      success: true,
      message: 'Signalement enregistré',
      new_score: data?.new_score,
      new_label: data?.new_label
    };
  } catch (err) {
    console.error('voteDown exception:', err);
    return {
      success: false,
      error: String(err),
      message: 'Erreur inattendue'
    };
  }
}

// ============================================================
// CRÉATION D'UNE NOUVELLE QA_MEMORY
// ============================================================

/**
 * Crée une nouvelle qa_memory à partir d'une réponse validée
 * IMPORTANT: Toujours créée au niveau ORGANISATION (pas Verticale)
 * Car l'utilisateur valide pour son org, pas pour toute la verticale
 */
export async function createQAMemory(params: CreateQAMemoryParams): Promise<{ id: string | null; error: string | null }> {
  try {
    // Récupérer l'utilisateur courant
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { id: null, error: 'Utilisateur non authentifié' };
    }

    // Générer l'embedding pour la question (optionnel, peut être fait async)
    let embedding = null;
    try {
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
        body: { text: params.question_text }
      });
      if (!embeddingError && embeddingData?.embedding) {
        embedding = embeddingData.embedding;
      }
    } catch (embErr) {
      console.warn('Embedding generation failed, continuing without:', embErr);
      // Continuer sans embedding - sera généré plus tard si nécessaire
    }

    // Insérer la qa_memory au niveau ORGANISATION uniquement
    const { data, error } = await supabase
      .from('qa_memory')
      .insert({
        question_text: params.question_text,
        answer_text: params.answer_text,
        embedding: embedding,
        // NIVEAU ORGANISATION - pas de target_verticals
        org_id: params.org_id,
        target_verticals: null,  // Explicitement null - pas au niveau verticale
        target_projects: params.target_projects || null,
        source_document_ids: params.source_document_ids || null,
        // Scores initiaux
        trust_score: 1,
        usage_count: 0,
        authority_label: 'user',
        // Audit
        created_by: user.id,
        validators_ids: [user.id]
      })
      .select('id')
      .single();

    if (error) {
      console.error('createQAMemory error:', error);
      return { id: null, error: error.message };
    }

    console.log('✅ qa_memory créée au niveau Organisation:', data.id);
    return { id: data.id, error: null };
  } catch (err) {
    console.error('createQAMemory exception:', err);
    return { id: null, error: String(err) };
  }
}

// ============================================================
// VOTE SUR UNE NOUVELLE RÉPONSE (sans qa_memory existante)
// ============================================================

/**
 * Vote positif sur une nouvelle réponse qui n'a pas encore de qa_memory
 * Crée la qa_memory au niveau ORGANISATION puis enregistre le vote
 * 
 * Note: targetVerticals est ignoré intentionnellement
 * La qa_memory est TOUJOURS créée au niveau org pour respecter les droits d'écriture
 */
export async function voteUpNewAnswer(
  voteContext: VoteContext, 
  orgId: string, 
  _targetVerticals?: string[],  // Préfixé _ car intentionnellement ignoré
  targetProjects?: string[]
): Promise<VoteResult & { qa_id?: string }> {
  try {
    // Créer la qa_memory au niveau Organisation
    const { id: qaId, error: createError } = await createQAMemory({
      question_text: voteContext.question,
      answer_text: voteContext.answer,
      source_document_ids: voteContext.source_ids,
      org_id: orgId,
      // target_verticals volontairement omis - toujours au niveau org
      target_projects: targetProjects
    });

    if (createError || !qaId) {
      return {
        success: false,
        error: createError || 'Erreur création qa_memory',
        message: 'Impossible de sauvegarder la réponse'
      };
    }

    return {
      success: true,
      message: 'Réponse validée et sauvegardée',
      new_score: 1,
      new_label: 'user',
      qa_id: qaId
    };
  } catch (err) {
    console.error('voteUpNewAnswer exception:', err);
    return {
      success: false,
      error: String(err),
      message: 'Erreur inattendue'
    };
  }
}

// ============================================================
// VÉRIFICATION SI L'UTILISATEUR A DÉJÀ VOTÉ
// ============================================================

/**
 * Vérifie si l'utilisateur courant a déjà voté pour une qa_memory
 */
export async function hasUserVoted(qaId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('qa_memory')
      .select('validators_ids')
      .eq('id', qaId)
      .single();

    if (error || !data) return false;

    const validators = data.validators_ids as string[] || [];
    return validators.includes(user.id);
  } catch {
    return false;
  }
}
