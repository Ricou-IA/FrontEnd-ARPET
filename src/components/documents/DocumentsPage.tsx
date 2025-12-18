// ============================================================
// ARPET - DocumentsPage Component
// Version: 1.0.0 - Page principale de gestion des documents
// Date: 2025-12-18
// ============================================================

import { useEffect, useState } from 'react'
import { Search, Upload, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { DocumentsTabs } from './DocumentsTabs'
import { DocumentsList } from './DocumentsList'
import { ImportDocumentModal } from './ImportDocumentModal'
import { LAYER_CONFIG } from '@/types'

export function DocumentsPage() {
  const {
    documents,
    documentsLoading,
    documentsError,
    documentsActiveLayer,
    documentsCounts,
    fetchDocuments,
    fetchDocumentsCounts,
    clearDocumentsError,
  } = useAppStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // Charger les documents et counts au mount
  useEffect(() => {
    fetchDocuments()
    fetchDocumentsCounts()
  }, [fetchDocuments, fetchDocumentsCounts])

  // Config de la couche active
  const layerConfig = LAYER_CONFIG[documentsActiveLayer]

  // Filtrer les documents par recherche
  const filteredDocuments = documents.filter(doc => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      doc.original_filename.toLowerCase().includes(query) ||
      doc.metadata?.category?.toLowerCase().includes(query) ||
      doc.metadata?.description?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-50 dark:bg-stone-950">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-serif text-stone-800 dark:text-stone-100">
              📚 Documents
            </h1>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${layerConfig.bgColor} ${layerConfig.color}`}>
              {layerConfig.icon} {layerConfig.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Bouton Rafraîchir */}
            <button
              onClick={() => fetchDocuments()}
              disabled={documentsLoading}
              className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-800 rounded-lg transition disabled:opacity-50"
              title="Rafraîchir"
            >
              <RefreshCw className={`w-5 h-5 ${documentsLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Bouton Import (visible uniquement sur couche Perso) */}
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

        {/* Barre de recherche */}
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

      {/* Erreur */}
      {documentsError && (
        <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
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

      {/* Liste des documents */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <DocumentsList
          documents={filteredDocuments}
          loading={documentsLoading}
          emptyMessage={
            searchQuery
              ? `Aucun document ne correspond à "${searchQuery}"`
              : `Aucun document dans ${layerConfig.labelPlural}`
          }
        />
      </div>

      {/* Description de la couche */}
      <div className="flex-shrink-0 px-6 py-3 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
        <p className="text-xs text-stone-400 dark:text-stone-500">
          {layerConfig.icon} <strong>{layerConfig.labelPlural}</strong> — {layerConfig.description}
        </p>
      </div>

      {/* Modal Import */}
      <ImportDocumentModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  )
}
