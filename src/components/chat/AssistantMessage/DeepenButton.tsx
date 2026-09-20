// ============================================================
// DeepenButton — Sprint 2 RAG
// Relance la question en lecture intégrale des documents nommés.
// ============================================================

import { BookOpen } from 'lucide-react'
// Sprint 2 RAG — importé directement depuis chat.types (pas encore réexporté par le barrel '../../../types')
import type { NamedDocumentRef } from '../../../types/chat.types'

interface DeepenButtonProps {
  namedDocuments: NamedDocumentRef[]
  disabled?: boolean
  onClick: () => void
}

export function DeepenButton({ namedDocuments, disabled, onClick }: DeepenButtonProps) {
  const names = [...new Set(namedDocuments.filter(d => d.status === 'found').flatMap(d => d.found))]
  if (names.length === 0) return null
  const label = names.length <= 2 ? names.join(' et ') : `${names.slice(0, 2).join(', ')} et ${names.length - 2} autre${names.length > 3 ? 's' : ''}`
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Relance la question en lisant ces documents en entier (environ 15 secondes)"
      className="mt-3 inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50"
    >
      <BookOpen className="w-3.5 h-3.5" />
      <span>Approfondir — lecture intégrale de {label} (~15 s)</span>
    </button>
  )
}
