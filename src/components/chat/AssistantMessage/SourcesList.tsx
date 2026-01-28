// ============================================================
// SourcesList Component
// Liste des sources d'un message
// ============================================================

import type { MessageSource, ViewerDocument } from '../../../types'
import { SourceBadge } from './SourceBadge'

interface SourcesListProps {
  sources: MessageSource[]
  onOpenViewer: (doc: ViewerDocument) => void
}

export function SourcesList({ sources, onOpenViewer }: SourcesListProps) {
  if (!sources || sources.length === 0) return null

  return (
    <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800">
      <p className="text-[10px] text-stone-400 dark:text-stone-500 font-medium mb-1.5">Sources :</p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((source, index) => (
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
