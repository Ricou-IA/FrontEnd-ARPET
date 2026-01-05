// ============================================================
// ARPET - DocumentsPage Component
// Version: 2.2.1 - Fix z-index header pour modales
// Date: 2025-01-04
//
// MODIFICATIONS v2.2.1:
// - z-50 → z-10 sur le header pour éviter de passer au-dessus des modales
// ============================================================

import { useEffect, useState, useMemo } from 'react'
import { Search, RefreshCw, Upload } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { LAYER_CONFIG } from '@/types'
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
    <div className="w-full h-full flex flex-col">
      {/* Header - v2.2.1: z-10 pour ne pas passer au-dessus des modales */}
      <header className="sticky top-0 z-10 flex-shrink-0 px-8 pt-4 pb-4 space-y-4 bg-transparent border-b-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-4xl font-normal text-[#0B0F17] dark:text-stone-100">
              Documents
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={documentsLoading || categoriesLoading}
              className="p-2 text-gray-500 hover:text-[#0B0F17] hover:bg-gray-100 rounded-lg transition"
              title="Actualiser"
            >
              <RefreshCw className={`w-4 h-4 ${(documentsLoading || categoriesLoading) ? 'animate-spin' : ''}`} />
            </button>

            {layerConfig.canUpload && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-gray-800 to-black text-white rounded-lg border-t border-gray-700 shadow-lg shadow-black/20 hover:from-gray-700 hover:to-gray-900 transition text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                Importer
              </button>
            )}
          </div>
        </div>

        {/* Barre de recherche flottante */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans tous les documents..."
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-md text-sm text-[#0B0F17] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-slate-800 transition-shadow"
          />
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-transparent">
        <DocumentsTabs counts={documentsCounts} />
      </div>

      {/* Filtres catégories - Transparent */}
      {availableCategories.length > 0 && (
        <div className="flex-shrink-0 px-6 py-4 bg-transparent">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setDocumentsActiveCategory(null)}
              className={`
                px-4 py-2 text-xs font-medium rounded-md transition
                ${documentsActiveCategory === null
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-100'
                }
              `}
            >
              Tous
            </button>

            {availableCategories.map(category => {
              const isActive = documentsActiveCategory === category.id
              const count = categoryCounts[category.id] || 0

              return (
                <button
                  key={category.id}
                  onClick={() => setDocumentsActiveCategory(category.id)}
                  className={`
                    flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md transition
                    ${isActive
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-100'
                    }
                  `}
                  title={category.description || undefined}
                >
                  <span>{category.label}</span>
                  {count > 0 && (
                    <span className={`
                      text-[10px] px-1.5 py-0.5 rounded min-w-[18px] text-center
                      ${isActive 
                        ? 'bg-white/20' 
                        : 'bg-gray-100'
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
        <div className="flex-shrink-0 mx-6 mt-4 p-4 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-gray-700">
            Erreur: {documentsError.message}
          </span>
          <button
            onClick={clearDocumentsError}
            className="text-gray-400 hover:text-[#0B0F17]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Liste des documents - PREND TOUT L'ESPACE RESTANT */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {/* Carte blanche minimaliste - Effet Lévitation */}
        <div className="bg-white rounded-2xl shadow-[0_40px_70px_-15px_rgba(0,0,0,0.4)] ring-1 ring-black/5 min-h-full flex flex-col">
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
            onImportClick={layerConfig.canUpload ? () => setIsImportModalOpen(true) : undefined}
          />
        </div>
      </div>

      <ImportDocumentModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  )
}
