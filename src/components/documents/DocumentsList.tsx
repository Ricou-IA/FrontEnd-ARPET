// ============================================================
// ARPET - DocumentsList Component
// Version: 1.0.0 - Liste des documents avec filtres
// Date: 2025-12-18
// ============================================================

import { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { DocumentRow } from './DocumentRow'
import { CATEGORY_CONFIG, type SourceFile, type DocumentCategory } from '@/types'

interface DocumentsListProps {
  documents: SourceFile[]
  loading: boolean
  emptyMessage?: string
}

const CATEGORY_FILTERS: (DocumentCategory | 'all')[] = [
  'all',
  'CCTP',
  'CR',
  'Planning',
  'Devis',
  'Plan',
  'Note',
  'Autre'
]

export function DocumentsList({ documents, loading, emptyMessage }: DocumentsListProps) {
  const [activeFilter, setActiveFilter] = useState<DocumentCategory | 'all'>('all')

  // Filtrer par catégorie
  const filteredDocuments = documents.filter(doc => {
    if (activeFilter === 'all') return true
    return doc.metadata?.category === activeFilter
  })

  // État de chargement
  if (loading && documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-stone-400 dark:text-stone-500">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">Chargement des documents...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtres par catégorie */}
      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORY_FILTERS.map((filter) => {
          const isActive = activeFilter === filter
          const config = filter === 'all' ? null : CATEGORY_CONFIG[filter]
          
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-full transition-colors
                ${isActive
                  ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                }
              `}
            >
              {filter === 'all' ? (
                'Tous'
              ) : (
                <>
                  {config?.icon} {config?.label}
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Liste vide */}
      {filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-stone-400 dark:text-stone-500">
          <FileText className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">{emptyMessage || 'Aucun document'}</p>
        </div>
      ) : (
        /* Tableau des documents */
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
          {/* Header du tableau */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            <div className="col-span-1">Type</div>
            <div className="col-span-5">Nom</div>
            <div className="col-span-2">Catégorie</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Lignes */}
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {filteredDocuments.map((doc) => (
              <DocumentRow key={doc.id} document={doc} />
            ))}
          </div>
        </div>
      )}

      {/* Footer avec count */}
      {filteredDocuments.length > 0 && (
        <p className="text-xs text-stone-400 dark:text-stone-500 text-right">
          {filteredDocuments.length} document{filteredDocuments.length > 1 ? 's' : ''}
          {activeFilter !== 'all' && ` (filtre: ${CATEGORY_CONFIG[activeFilter]?.label})`}
        </p>
      )}
    </div>
  )
}
