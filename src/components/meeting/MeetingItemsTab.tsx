// ============================================================
// ARPET - MeetingItemsTab Component
// Version: 1.0.0 - Phase 6/8 — Dashboard actions & decisions
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  AlertCircle,
  Loader2,
  ClipboardList,
  Search,
  ChevronDown,
  Calendar,
} from 'lucide-react'
import {
  getProjectMeetingItems,
  getItemsStats,
  isItemOverdue,
} from '@/services/meeting-items.service'
import {
  updateMeetingItem,
  getItemTypeIcon,
  getItemTypeLabel,
  getItemTypeColor,
} from '@/services/meeting.service'
import type {
  MeetingItemType,
  MeetingItemStatus,
} from '@/types/meeting.types'
import type {
  MeetingItemWithContext,
  MeetingItemsStats,
  MeetingItemFilters,
} from '@/services/meeting-items.service'

// ============================================================
// TYPES
// ============================================================

interface MeetingItemsTabProps {
  projectId: string;
  refreshKey: number;
  typeFilter: TypeFilter;
  onTypeFilterChange: (filter: TypeFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  onStatsLoaded?: (stats: MeetingItemsStats | null) => void;
}

export type TypeFilter = 'all' | MeetingItemType;
export type StatusFilter = 'all' | MeetingItemStatus | 'overdue';

export const TYPE_OPTIONS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'action', label: 'Actions' },
  { id: 'decision', label: 'Decisions' },
  { id: 'issue', label: 'Problemes' },
  { id: 'info', label: 'Infos' },
];

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'open', label: 'Ouvert' },
  { id: 'in_progress', label: 'En cours' },
  { id: 'done', label: 'Termine' },
  { id: 'cancelled', label: 'Annule' },
  { id: 'overdue', label: 'En retard' },
];

const STATUS_LABELS: Record<MeetingItemStatus, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  done: 'Termine',
  cancelled: 'Annule',
};

// ============================================================
// HELPERS
// ============================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getStatusBadgeColor(status: MeetingItemStatus): string {
  switch (status) {
    case 'open': return 'bg-blue-100 text-blue-700'
    case 'in_progress': return 'bg-amber-100 text-amber-700'
    case 'done': return 'bg-green-100 text-green-700'
    case 'cancelled': return 'bg-stone-100 text-stone-500'
    default: return 'bg-stone-100 text-stone-600'
  }
}

// ============================================================
// COMPONENT
// ============================================================

export function MeetingItemsTab({ projectId, refreshKey, typeFilter, onTypeFilterChange, statusFilter, onStatusFilterChange, onStatsLoaded }: MeetingItemsTabProps) {
  const [items, setItems] = useState<MeetingItemWithContext[]>([])
  const [stats, setStats] = useState<MeetingItemsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Filtres internes (recherche, lot, responsable)
  const [lotFilter, setLotFilter] = useState<string | null>(null)
  const [responsibleFilter, setResponsibleFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Status update en cours
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)

  // Feedback toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Flash animation sur l'item modifie
  const [flashItemId, setFlashItemId] = useState<string | null>(null)

  // Charger les donnees
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Construire les filtres pour le service
    const filters: MeetingItemFilters = {}
    if (typeFilter !== 'all') filters.item_type = typeFilter
    if (statusFilter === 'overdue') {
      filters.overdue_only = true
    } else if (statusFilter !== 'all') {
      filters.status = statusFilter
    }
    if (lotFilter) filters.lot_reference = lotFilter
    if (responsibleFilter) filters.responsible = responsibleFilter
    if (searchQuery.trim()) filters.search = searchQuery.trim()

    const [itemsResult, statsResult] = await Promise.all([
      getProjectMeetingItems(projectId, filters),
      getItemsStats(projectId),
    ])

    if (itemsResult.error) {
      setError(itemsResult.error)
      setItems([])
    } else {
      setItems(itemsResult.data || [])
    }

    if (statsResult.data) {
      setStats(statsResult.data)
      onStatsLoaded?.(statsResult.data)
    }

    setLoading(false)
  }, [projectId, typeFilter, statusFilter, lotFilter, responsibleFilter, searchQuery])

  useEffect(() => {
    loadData()
  }, [loadData, refreshKey])

  // Valeurs distinctes pour les dropdowns lot/responsable (calcule cote client sur les items non filtres)
  const distinctLots = useMemo(() => {
    const lots = new Set<string>()
    items.forEach(item => {
      if (item.lot_reference) lots.add(item.lot_reference)
    })
    return Array.from(lots).sort()
  }, [items])

  const distinctResponsibles = useMemo(() => {
    const responsibles = new Set<string>()
    items.forEach(item => {
      if (item.responsible) responsibles.add(item.responsible)
    })
    return Array.from(responsibles).sort()
  }, [items])

  // Afficher un toast ephemere
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Reset de tous les filtres
  const resetFilters = useCallback(() => {
    onTypeFilterChange('all')
    onStatusFilterChange('all')
    setLotFilter(null)
    setResponsibleFilter(null)
    setSearchQuery('')
  }, [onTypeFilterChange, onStatusFilterChange])

  // Verifier si des filtres sont actifs
  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all' || !!lotFilter || !!responsibleFilter || !!searchQuery.trim()

  // Mise a jour inline du statut
  const handleStatusChange = async (itemId: string, newStatus: MeetingItemStatus) => {
    setUpdatingItemId(itemId)

    // Garder l'ancien statut pour rollback
    const oldItem = items.find(i => i.id === itemId)
    const oldStatus = oldItem?.status

    // Update optimiste
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, status: newStatus } : item
    ))

    const { error: updateError } = await updateMeetingItem(itemId, { status: newStatus })

    if (updateError) {
      // Rollback
      if (oldStatus) {
        setItems(prev => prev.map(item =>
          item.id === itemId ? { ...item, status: oldStatus } : item
        ))
      } else {
        loadData()
      }
      showToast('Erreur — statut restaure', 'error')
    } else {
      // Flash vert sur l'item
      setFlashItemId(itemId)
      setTimeout(() => setFlashItemId(null), 1000)
      showToast('Statut mis a jour', 'success')
    }

    // Recharger les stats
    const { data: newStats } = await getItemsStats(projectId)
    if (newStats) {
      setStats(newStats)
      onStatsLoaded?.(newStats)
    }

    setUpdatingItemId(null)
  }

  // ---- Loading ----
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
      </div>
    )
  }

  // ---- Error ----
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-8">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-sm text-stone-600 mb-1">Erreur de chargement</p>
        <p className="text-xs text-stone-400">{error.message}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition"
        >
          Reessayer
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Barre de filtres */}
      <div className="flex-shrink-0 px-6 py-3 bg-transparent space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par sujet..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-lg text-slate-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
          </div>

          {/* Filtre statut */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
              className="appearance-none pl-3 pr-7 py-2 text-xs bg-white border border-gray-200 rounded-lg text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-800 cursor-pointer"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>

          {/* Filtre lot */}
          {distinctLots.length > 0 && (
            <div className="relative">
              <select
                value={lotFilter || ''}
                onChange={(e) => setLotFilter(e.target.value || null)}
                className="appearance-none pl-3 pr-7 py-2 text-xs bg-white border border-gray-200 rounded-lg text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-800 cursor-pointer"
              >
                <option value="">Tous les lots</option>
                {distinctLots.map(lot => (
                  <option key={lot} value={lot}>{lot}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Filtre responsable */}
          {distinctResponsibles.length > 0 && (
            <div className="relative">
              <select
                value={responsibleFilter || ''}
                onChange={(e) => setResponsibleFilter(e.target.value || null)}
                className="appearance-none pl-3 pr-7 py-2 text-xs bg-white border border-gray-200 rounded-lg text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-800 cursor-pointer"
              >
                <option value="">Tous les responsables</option>
                {distinctResponsibles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Liste des items ou etat vide */}
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-8">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
            <ClipboardList className="w-7 h-7 text-stone-400" />
          </div>
          <h3 className="text-sm font-medium text-stone-700 mb-1">
            Aucun item
          </h3>
          <p className="text-xs text-stone-400 max-w-xs">
            {hasActiveFilters
              ? 'Aucun item ne correspond aux filtres selectionnes.'
              : 'Aucune decision, action ou probleme extrait des reunions de ce projet.'
            }
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-3 text-xs text-amber-600 hover:text-amber-700 font-medium hover:underline transition-colors"
            >
              Reinitialiser tous les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {items.map(item => {
            const overdue = isItemOverdue(item)
            const typeColors = getItemTypeColor(item.item_type)
            const isUpdating = updatingItemId === item.id

            return (
              <div
                key={item.id}
                className={`
                  flex items-start gap-3 md:gap-4 px-4 md:px-6 py-4 transition-all duration-300
                  ${overdue ? 'border-l-4 border-red-400 bg-red-50/30' : 'hover:bg-stone-50/50'}
                  ${flashItemId === item.id ? 'bg-green-50/60' : ''}
                `}
              >
                {/* Icone type */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${typeColors.bg} flex items-center justify-center text-sm mt-0.5`}>
                  {getItemTypeIcon(item.item_type)}
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Sujet */}
                      <h4 className="text-sm font-medium text-stone-800 truncate">
                        {item.subject}
                      </h4>

                      {/* Meta : responsable, lot, echeance */}
                      <div className="flex items-center gap-3 mt-1 text-xs text-stone-400 flex-wrap">
                        {/* Type label */}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColors.bg} ${typeColors.text}`}>
                          {getItemTypeLabel(item.item_type)}
                        </span>

                        {item.responsible && (
                          <span>
                            {item.responsible}
                          </span>
                        )}
                        {item.lot_reference && (
                          <span className="text-stone-500">
                            {item.lot_reference}
                          </span>
                        )}
                        {item.due_date && (
                          <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.due_date)}
                            {overdue && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold ml-1">
                                RETARD
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Reunion d'origine */}
                      <p className="text-[11px] text-stone-400 mt-1">
                        {item.meeting_title || 'Reunion'} — {item.meeting_date ? formatDate(item.meeting_date) : ''}
                      </p>
                    </div>

                    {/* Dropdown statut */}
                    <div className="flex-shrink-0 relative">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as MeetingItemStatus)}
                        disabled={isUpdating}
                        className={`
                          appearance-none pl-2.5 pr-6 py-1 text-xs font-medium rounded-full border cursor-pointer
                          ${getStatusBadgeColor(item.status)}
                          ${isUpdating ? 'opacity-50 cursor-wait' : ''}
                          focus:outline-none focus:ring-1 focus:ring-stone-300
                        `}
                      >
                        <option value="open">{STATUS_LABELS.open}</option>
                        <option value="in_progress">{STATUS_LABELS.in_progress}</option>
                        <option value="done">{STATUS_LABELS.done}</option>
                        <option value="cancelled">{STATUS_LABELS.cancelled}</option>
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60" />
                    </div>
                  </div>

                  {/* Contenu (si present et different du sujet) */}
                  {item.content && item.content !== item.subject && (
                    <p className="text-xs text-stone-500 mt-1.5 line-clamp-2">
                      {item.content}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer compteur */}
      {items.length > 0 && (
        <div className="flex-shrink-0 px-4 md:px-6 py-3 border-t border-stone-100 text-xs text-stone-400 text-right">
          {items.length} item{items.length > 1 ? 's' : ''}
          {stats && stats.overdue_count > 0 && (
            <span className="ml-2 text-red-500 font-medium">
              ({stats.overdue_count} en retard)
            </span>
          )}
        </div>
      )}

      {/* Toast ephemere */}
      {toast && (
        <div className={`
          fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg
          text-sm font-medium animate-[fadeIn_0.2s_ease-out]
          ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}
        `}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}
    </div>
  )
}
