// ============================================
// HELPERS GÉNÉRIQUES PARTAGÉS
// ============================================

import type { AuthorityLabel } from './qa-memory.types';
import type { KnowledgeType, MessageSource } from './chat.types';

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
    case 'memory':
      return '🧠';
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
