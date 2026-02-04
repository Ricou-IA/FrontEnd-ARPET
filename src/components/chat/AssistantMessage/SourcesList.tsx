// ============================================================
// SourcesList Component
// Liste des sources d'un message (filtrées par citation)
// ============================================================

import { useMemo } from 'react'
import type { MessageSource, ViewerDocument } from '../../../types'
import { SourceBadge } from './SourceBadge'

interface SourcesListProps {
  sources: MessageSource[]
  responseContent?: string
  onOpenViewer: (doc: ViewerDocument) => void
}

/**
 * Filtre les sources pour ne garder que celles effectivement citées dans la réponse.
 * Compare le nom du document source avec le contenu textuel de la réponse.
 * Si aucune source n'est citée (ex: réponse conversationnelle), affiche toutes les sources.
 */
function filterCitedSources(sources: MessageSource[], responseContent?: string): MessageSource[] {
  if (!responseContent || sources.length <= 1) return sources

  const contentLower = responseContent.toLowerCase()

  const cited = sources.filter(source => {
    // QA memory toujours affichée
    if (source.type === 'qa_memory') return true

    const name = source.document_name || source.name
    if (!name) return true

    // Vérifier si le nom du document (ou une partie significative) est mentionné dans la réponse
    const nameLower = name.toLowerCase()
    // Nom complet
    if (contentLower.includes(nameLower)) return true
    // Nom sans extension
    const nameNoExt = nameLower.replace(/\.[^.]+$/, '')
    if (nameNoExt.length > 3 && contentLower.includes(nameNoExt)) return true

    return false
  })

  // Si le filtre élimine tout, on renvoie les sources originales (sécurité)
  return cited.length > 0 ? cited : sources
}

export function SourcesList({ sources, responseContent, onOpenViewer }: SourcesListProps) {
  if (!sources || sources.length === 0) return null

  const filteredSources = useMemo(
    () => filterCitedSources(sources, responseContent),
    [sources, responseContent]
  )

  return (
    <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800">
      <p className="text-[10px] text-stone-400 dark:text-stone-500 font-medium mb-1.5">Sources :</p>
      <div className="flex flex-wrap gap-1.5">
        {filteredSources.map((source, index) => (
          <SourceBadge
            key={source.id || source.source_file_id || index}
            source={source}
            onOpenViewer={onOpenViewer}
          />
        ))}
      </div>
    </div>
  )
}
