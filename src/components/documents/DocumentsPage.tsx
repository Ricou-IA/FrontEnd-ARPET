// ============================================================
// ARPET - DocumentsPage Component
// Version: 2.0.0 - Full width layout
// Date: 2025-12-18
// ============================================================

import { useEffect, useState, useMemo } from 'react'
import { Search, RefreshCw, Upload } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { LAYER_CONFIG, isEmojiIcon } from '@/types'
import { DocumentsTabs } from './DocumentsTabs'
import { DocumentsList } from './DocumentsList'
import { ImportDocumentModal } from './ImportDocumentModal'

export function DocumentsPage() {
  const {
    documents,
    documentsLoading,
    documentsError,
    documentsActiveLayer,
    documentsActiveCategory,
    documentsCounts,
    availableCategories,
    categoriesLoading,
    setDocumentsActiveCategory,
    fetchDocuments,
    fetchDocumentsCounts,
    fetchDocumentCategories,
    clearDocumentsError,
  } = useAppStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  const layerConfig = LAYER_CONFIG[documentsActiveLayer]

  // Charger les documents, counts et catégories au montage
  useEffect(() => {
    fetchDocuments()
    fetchDocumentsCounts()
    fetchDocumentCategories()
  }, [])

  // Filtrer les documents
  const filteredDocuments = useMemo(() => {
    let filtered = documents

    if (documentsActiveCategory) {
      filtered = filtered.filter(
        doc => doc.metadata?.category === documentsActiveCategory
      )
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(doc =>
        doc.original_filename.toLowerCase().includes(query) ||
        doc.metadata?.description?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [documents, documentsActiveCategory, searchQuery])

  // Compter les documents par catégorie
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    documents.forEach(doc => {
      const catId = doc.metadata?.category
      if (catId) {
        counts[catId] = (counts[catId] || 0) + 1
      }
    })
    return counts
  }, [documents])

  const handleRefresh = () => {
    fetchDocuments()
    fetchDocumentsCounts()
    fetchDocumentCategories()
  }

  const activeCategoryConfig = documentsActiveCategory 
    ? availableCategories.find(c => c.id === documentsActiveCategory)
    : null

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-stone-900">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 space-y-4 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-stone-800 dark:text-stone-100">
              📚 Documents
            </h1>
            <span className={`text-xs px-2 py-0.5 rounded-full ${layerConfig.bgColor} ${layerConfig.color}`}>
              {layerConfig.icon} {layerConfig.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={documentsLoading || categoriesLoading}
              className="p-2 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition"
              title="Actualiser"
            >
              <RefreshCw className={`w-4 h-4 ${(documentsLoading || categoriesLoading) ? 'animate-spin' : ''}`} />
            </button>

            {layerConfig.canUpload && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800 rounded-lg hover:bg-black dark:hover:bg-white transition text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                Importer
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans tous les documents..."
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600 transition"
          />
        </div>
      </div>

      {/* Tabs */}
      <DocumentsTabs counts={documentsCounts} />

      {/* Filtres catégories */}
      {availableCategories.length > 0 && (
        <div className="flex-shrink-0 px-6 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setDocumentsActiveCategory(null)}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-full transition
                ${documentsActiveCategory === null
                  ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
                }
              `}
            >
              Tous
            </button>

            {availableCategories.map(category => {
              const isActive = documentsActiveCategory === category.id
              const count = categoryCounts[category.id] || 0
              const iconDisplay = category.icon 
                ? (isEmojiIcon(category.icon) ? category.icon : '📄')
                : '📄'

              return (
                <button
                  key={category.id}
                  onClick={() => setDocumentsActiveCategory(category.id)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition
                    ${isActive
                      ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800'
                      : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
                    }
                  `}
                  title={category.description || undefined}
                >
                  <span>{iconDisplay}</span>
                  <span>{category.label}</span>
                  {count > 0 && (
                    <span className={`
                      text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center
                      ${isActive 
                        ? 'bg-white/20 dark:bg-stone-800/20' 
                        : 'bg-stone-100 dark:bg-stone-700'
                      }
                    `}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Erreur */}
      {documentsError && (
        <div className="flex-shrink-0 mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-600 dark:text-red-400">
            Erreur: {documentsError.message}
          </span>
          <button
            onClick={clearDocumentsError}
            className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* Liste des documents - PREND TOUT L'ESPACE RESTANT */}
      <div className="flex-1 overflow-auto">
        <DocumentsList
          documents={filteredDocuments}
          loading={documentsLoading}
          emptyMessage={
            searchQuery
              ? `Aucun document ne correspond à "${searchQuery}"`
              : documentsActiveCategory
                ? `Aucun document de type "${activeCategoryConfig?.label || 'sélectionné'}"`
                : `Aucun document dans ${layerConfig.labelPlural}`
          }
        />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-6 py-3 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
        <p className="text-xs text-stone-400 dark:text-stone-500">
          {layerConfig.icon} <strong>{layerConfig.labelPlural}</strong> — {layerConfig.description}
        </p>
      </div>

      <ImportDocumentModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  )
}
