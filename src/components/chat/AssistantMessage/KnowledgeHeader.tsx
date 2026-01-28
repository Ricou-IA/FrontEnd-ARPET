// ============================================================
// KnowledgeHeader Component
// Header selon le type de réponse (Expert, Mémoire, Team, Nouvelle)
// ============================================================

import { Check, Brain } from 'lucide-react'
import type { KnowledgeType } from '../../../types'

interface KnowledgeHeaderProps {
  fromMemory?: boolean
  isExpert?: boolean
  knowledgeType?: KnowledgeType
  trustScore: number
}

export function KnowledgeHeader({
  fromMemory,
  isExpert,
  knowledgeType,
  trustScore,
}: KnowledgeHeaderProps) {
  // Réponse depuis mémoire collective - FAQ Expert
  if (fromMemory && isExpert) {
    return (
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-100 dark:border-amber-900/30">
        <span className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
          ⭐ FAQ Expert
        </span>
        <span className="text-[10px] text-stone-400 dark:text-stone-500">
          Réponse instantanée
        </span>
      </div>
    )
  }

  // Réponse depuis mémoire collective
  if (fromMemory) {
    return (
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-100 dark:border-green-900/30">
        <span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
          <Brain className="w-2.5 h-2.5" />
          Mémoire Collective
        </span>
        {trustScore > 0 && (
          <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">
            {trustScore} validation{trustScore > 1 ? 's' : ''}
          </span>
        )}
      </div>
    )
  }

  // Réponses validées par l'équipe
  if (knowledgeType === 'team_validated' || trustScore >= 3) {
    return (
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-100 dark:border-green-900/30">
        <span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
          <Check className="w-2.5 h-2.5" />
          Validée par l'équipe
        </span>
        {trustScore > 0 && (
          <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">
            {trustScore} validation{trustScore > 1 ? 's' : ''}
          </span>
        )}
      </div>
    )
  }

  // Nouvelle réponse RAG
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-100 dark:border-blue-900/30">
      <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
        ✨ Nouvelle réponse
      </span>
      <span className="text-[10px] text-stone-400 dark:text-stone-500">
        Votez 👍 si cette réponse vous aide
      </span>
    </div>
  )
}
