// ============================================================
// ARPET - ReunionsPage Component
// Version: 2.0.0 - Ajout onglet Documents Generes
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, FolderOpen, FileText, Eye, Loader2, Download, AlertTriangle } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { MeetingHistoryTab, SOURCE_FILTERS, type SourceFilter } from './MeetingHistoryTab'
import { MeetingItemsTab, TYPE_OPTIONS, type TypeFilter, type StatusFilter } from './MeetingItemsTab'
import { getItemTypeIcon } from '@/services/meeting.service'
import type { MeetingItemType } from '@/types/meeting.types'
import type { MeetingItemsStats } from '@/services/meeting-items.service'
import { GenerateDocZone } from '../documents/GenerateDocZone'
import {
  getDocumentCategories,
  getFilesByLayer,
  getFileDownloadUrl,
} from '@/services/documents'
import { downloadAsPdf } from '@/services/meeting-documents.service'
import type { SourceFile, ViewerDocument } from '@/types'

type ReunionsTab = 'history' | 'items' | 'documents';

const TABS: { id: ReunionsTab; label: string }[] = [
  { id: 'history', label: 'Historique' },
  { id: 'items', label: 'Actions & Decisions' },
  { id: 'documents', label: 'Documents' },
];

// ============================================================
// SOUS-COMPOSANT : Liste des documents generes
// ============================================================

function GeneratedDocsList({
  projectId,
  refreshKey,
}: {
  projectId: string;
  refreshKey: number;
}) {
  const { openViewer } = useAppStore()
  const [docs, setDocs] = useState<SourceFile[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const loadDocs = useCallback(async () => {
    setLoading(true)

    // 1. Trouver la categorie "documents_generes" (UUID)
    const { data: categories } = await getDocumentCategories('project')
    const docGeneresCat = categories?.find(c => c.slug === 'documents_generes')
    const catUuid = docGeneresCat?.id || null

    // 2. Charger tous les documents du projet
    const { data } = await getFilesByLayer('project', { projectId })

    // 3. Filtrer cote client : accepter UUID ou slug dans metadata.category
    const filtered = (data || []).filter(f => {
      const cat = f.metadata?.category as string | undefined
      if (!cat) return false
      return cat === catUuid || cat === 'documents_generes'
    })

    setDocs(filtered)
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    loadDocs()
  }, [loadDocs, refreshKey])

  const handlePreview = async (file: SourceFile) => {
    if (!file.storage_path) return
    try {
      const { data: url } = await getFileDownloadUrl(
        file.storage_bucket,
        file.storage_path,
      )
      if (url) {
        const viewerDoc: ViewerDocument = {
          id: file.id,
          filename: file.original_filename,
          url,
          mimeType: file.mime_type,
          fileSize: file.file_size,
        }
        openViewer(viewerDoc)
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[ReunionsPage] Preview error:', err)
    }
  }

  const handleDownloadPdf = async (file: SourceFile) => {
    if (!file.storage_path) return
    setDownloadingId(file.id)
    await downloadAsPdf(
      file.storage_bucket,
      file.storage_path,
      file.original_filename,
    )
    setDownloadingId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-stone-400 animate-spin" />
      </div>
    )
  }

  if (docs.length === 0) {
    return (
      <div className="text-center py-12 px-8">
        <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3">
          <FileText className="w-6 h-6 text-stone-400" />
        </div>
        <p className="text-sm text-stone-500">
          Aucun document genere pour ce projet.
        </p>
        <p className="text-xs text-stone-400 mt-1">
          Utilisez les boutons ci-dessus pour generer un memo ou une fiche lot.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-stone-100">
      {/* Header */}
      <div className="px-4 md:px-6 py-3">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
          Documents generes ({docs.length})
        </h3>
      </div>

      {/* Liste */}
      {docs.map(file => {
        const isMarkdown = file.mime_type === 'text/markdown' || file.original_filename.endsWith('.md')
        const title = (file.metadata?.document_title as string) || file.original_filename
        const date = new Date(file.created_at).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })

        return (
          <div
            key={file.id}
            className="flex items-center gap-3 px-4 md:px-6 py-3 hover:bg-stone-50/50 transition group"
          >
            {/* Icone */}
            <div className="flex-shrink-0 w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-600" />
            </div>

            {/* Titre + date */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800 truncate">
                {title}
              </p>
              <p className="text-xs text-stone-400">{date}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handlePreview(file)}
                className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition"
                title="Apercu"
              >
                <Eye className="w-4 h-4" />
              </button>

              {isMarkdown && (
                <button
                  onClick={() => handleDownloadPdf(file)}
                  disabled={downloadingId === file.id}
                  className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition disabled:opacity-50"
                  title="Telecharger en PDF"
                >
                  {downloadingId === file.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export function ReunionsPage() {
  const { activeProject } = useAppStore()
  const [activeTab, setActiveTab] = useState<ReunionsTab>('history')
  const [refreshKey, setRefreshKey] = useState(0)

  // Filtres remontes — History
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')

  // Filtres remontes — Items
  const [itemsTypeFilter, setItemsTypeFilter] = useState<TypeFilter>('all')
  const [itemsStatusFilter, setItemsStatusFilter] = useState<StatusFilter>('all')
  const [itemsStats, setItemsStats] = useState<MeetingItemsStats | null>(null)

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Pas de projet selectionne
  if (!activeProject) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
          <FolderOpen className="w-8 h-8 text-stone-400" />
        </div>
        <h2 className="font-serif text-2xl text-stone-800 mb-2">
          Aucun projet selectionne
        </h2>
        <p className="text-sm text-stone-500 max-w-md">
          Selectionnez un projet dans le menu lateral pour consulter l'historique des reunions et le suivi des actions.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex-shrink-0 px-8 pt-4 pb-4 space-y-4 bg-transparent border-b-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-4xl font-normal text-[#0B0F17] dark:text-stone-100">
              Réunions
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-500 hover:text-[#0B0F17] hover:bg-gray-100 rounded-lg transition"
              title="Actualiser"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex-shrink-0 bg-transparent">
        <div className="flex px-6 gap-12" role="tablist" aria-label="Navigation réunions">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                id={`tab-${tab.id}`}
                className={`
                  relative flex items-center gap-2 px-0 py-4 text-base font-medium transition-colors
                  ${isActive
                    ? 'text-slate-900'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                {/* Point indicateur pour l'onglet actif */}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0B0F17]" />
                )}
                <span>{tab.label}</span>
                {/* Soulignement actif */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filtres — rendus HORS de la carte blanche, comme DocumentsPage */}
      {activeTab === 'history' && (
        <div className="flex-shrink-0 px-6 py-4 bg-transparent">
          <div className="flex items-center gap-2 flex-wrap">
            {SOURCE_FILTERS.map(filter => {
              const isActive = sourceFilter === filter.id
              return (
                <button
                  key={filter.id}
                  onClick={() => setSourceFilter(filter.id)}
                  className={`
                    px-4 py-2 text-xs font-medium rounded-md transition
                    ${isActive
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-100'
                    }
                  `}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'items' && itemsStats && (
        <div className="flex-shrink-0 px-6 py-4 bg-transparent">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Total */}
            <button
              onClick={() => { setItemsTypeFilter('all'); setItemsStatusFilter('all') }}
              className={`
                px-4 py-2 text-xs font-medium rounded-md transition
                ${itemsTypeFilter === 'all' && itemsStatusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-100'
                }
              `}
            >
              Total: {itemsStats.total}
            </button>

            {/* Par type */}
            {TYPE_OPTIONS.filter(t => t.id !== 'all').map(type => {
              const count = itemsStats.by_type[type.id as MeetingItemType] || 0
              const isActive = itemsTypeFilter === type.id && itemsStatusFilter !== 'overdue'
              return (
                <button
                  key={type.id}
                  onClick={() => { setItemsTypeFilter(type.id); setItemsStatusFilter('all') }}
                  title={`Filtrer par ${type.label}`}
                  className={`
                    flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md transition cursor-pointer
                    ${isActive
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-100'
                    }
                  `}
                >
                  <span>{getItemTypeIcon(type.id as MeetingItemType)}</span>
                  <span>{type.label}</span>
                  <span className={`
                    text-[10px] px-1.5 py-0.5 rounded min-w-[18px] text-center
                    ${isActive ? 'bg-white/20' : 'bg-gray-100'}
                  `}>
                    {count}
                  </span>
                </button>
              )
            })}

            {/* Retard */}
            {itemsStats.overdue_count > 0 && (
              <button
                onClick={() => { setItemsTypeFilter('all'); setItemsStatusFilter('overdue') }}
                className={`
                  flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md transition
                  ${itemsStatusFilter === 'overdue'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                  }
                `}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>En retard</span>
                <span className={`
                  text-[10px] px-1.5 py-0.5 rounded min-w-[18px] text-center
                  ${itemsStatusFilter === 'overdue' ? 'bg-white/20' : 'bg-red-50'}
                `}>
                  {itemsStats.overdue_count}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Contenu de l'onglet */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div
          className="bg-white rounded-2xl shadow-[0_40px_70px_-15px_rgba(0,0,0,0.4)] ring-1 ring-black/5 min-h-full flex flex-col"
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeTab === 'history' && (
            <MeetingHistoryTab
              projectId={activeProject.id}
              refreshKey={refreshKey}
              sourceFilter={sourceFilter}
              onSourceFilterChange={setSourceFilter}
            />
          )}
          {activeTab === 'items' && (
            <MeetingItemsTab
              projectId={activeProject.id}
              refreshKey={refreshKey}
              typeFilter={itemsTypeFilter}
              onTypeFilterChange={setItemsTypeFilter}
              statusFilter={itemsStatusFilter}
              onStatusFilterChange={setItemsStatusFilter}
              onStatsLoaded={setItemsStats}
            />
          )}
          {activeTab === 'documents' && (
            <div className="flex flex-col">
              {/* Zone de generation */}
              <GenerateDocZone
                projectId={activeProject.id}
                onDocumentGenerated={handleRefresh}
              />

              {/* Separator */}
              <div className="border-t border-stone-100" />

              {/* Liste des documents generes */}
              <GeneratedDocsList
                projectId={activeProject.id}
                refreshKey={refreshKey}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
