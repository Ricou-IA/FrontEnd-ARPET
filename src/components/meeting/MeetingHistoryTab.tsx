// ============================================================
// ARPET - MeetingHistoryTab Component
// Version: 1.0.0 - Phase 6/8 — Liste des reunions passees
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar,
  Clock,
  Users,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  getMeetingHistory,
  getSourceTypeIcon,
  getSourceTypeLabel,
} from '@/services/meeting.service'
import type {
  Meeting,
  MeetingSourceType,
  MeetingExtractionStatus,
} from '@/types/meeting.types'

// ============================================================
// TYPES
// ============================================================

interface MeetingHistoryTabProps {
  projectId: string;
  refreshKey: number;
  sourceFilter: SourceFilter;
  onSourceFilterChange: (filter: SourceFilter) => void;
}

export type SourceFilter = 'all' | MeetingSourceType;

export const SOURCE_FILTERS: { id: SourceFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'recording', label: 'Enregistrement' },
  { id: 'uploaded_audio', label: 'Import' },
  { id: 'memo', label: 'Memo' },
  { id: 'visio_bot', label: 'Visio' },
];

// ============================================================
// HELPERS
// ============================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatDurationMinutes(minutes: number | null): string {
  if (!minutes) return '-'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`
}

function getExtractionStatusConfig(status: MeetingExtractionStatus): {
  label: string;
  color: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case 'done':
    case 'extracted':
      return {
        label: 'Termine',
        color: 'bg-green-100 text-green-700',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      }
    case 'error':
      return {
        label: 'Erreur',
        color: 'bg-red-100 text-red-700',
        icon: <XCircle className="w-3.5 h-3.5" />,
      }
    case 'pending':
    case 'processing':
    case 'transcribed':
      return {
        label: 'En cours',
        color: 'bg-amber-100 text-amber-700',
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
      }
    default:
      return {
        label: status,
        color: 'bg-stone-100 text-stone-600',
        icon: <Clock className="w-3.5 h-3.5" />,
      }
  }
}

// ============================================================
// COMPONENT
// ============================================================

export function MeetingHistoryTab({ projectId, refreshKey, sourceFilter, onSourceFilterChange }: MeetingHistoryTabProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null)
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({})

  // Charger les meetings
  const loadMeetings = useCallback(async () => {
    setLoading(true)
    setError(null)

    const options = sourceFilter !== 'all' ? { sourceType: sourceFilter } : undefined
    const { data, error: err } = await getMeetingHistory(projectId, options)

    if (err) {
      setError(err)
      setMeetings([])
    } else {
      setMeetings(data || [])

      // Charger les compteurs d'items en batch
      const meetingIds = (data || []).map(m => m.id)
      if (meetingIds.length > 0) {
        const { data: itemsData } = await supabase
          .schema('arpet')
          .from('meeting_items')
          .select('meeting_id')
          .in('meeting_id', meetingIds)

        if (itemsData) {
          const counts: Record<string, number> = {}
          for (const row of itemsData) {
            counts[row.meeting_id] = (counts[row.meeting_id] || 0) + 1
          }
          setItemCounts(counts)
        }
      }
    }

    setLoading(false)
  }, [projectId, sourceFilter])

  useEffect(() => {
    loadMeetings()
  }, [loadMeetings, refreshKey])

  // Filtrage client-side si necessaire (le filtre source est applique cote serveur)
  const filteredMeetings = useMemo(() => meetings, [meetings])

  const toggleExpand = (meetingId: string) => {
    setExpandedMeetingId(prev => prev === meetingId ? null : meetingId)
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
          onClick={loadMeetings}
          className="mt-4 px-4 py-2 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition"
        >
          Reessayer
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Liste ou etat vide */}
      {filteredMeetings.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-8">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
            <Calendar className="w-7 h-7 text-stone-400" />
          </div>
          <h3 className="text-sm font-medium text-stone-700 mb-1">
            Aucune reunion
          </h3>
          <p className="text-xs text-stone-400 max-w-xs">
            {sourceFilter !== 'all'
              ? `Aucune reunion de type "${SOURCE_FILTERS.find(f => f.id === sourceFilter)?.label}" pour ce projet.`
              : 'Aucune reunion enregistree pour ce projet. Utilisez le bouton "Enregistrer" dans le menu pour demarrer.'
            }
          </p>
          {sourceFilter !== 'all' && (
            <button
              onClick={() => onSourceFilterChange('all')}
              className="mt-3 text-xs text-amber-600 hover:text-amber-700 font-medium hover:underline transition-colors"
            >
              Reinitialiser le filtre
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {filteredMeetings.map(meeting => {
            const isExpanded = expandedMeetingId === meeting.id
            const statusConfig = getExtractionStatusConfig(meeting.extraction_status)
            const participantsCount = meeting.participants?.length || 0
            const meetingItemCount = itemCounts[meeting.id] || 0

            return (
              <div key={meeting.id} className="group">
                {/* Ligne meeting */}
                <button
                  onClick={() => toggleExpand(meeting.id)}
                  className="w-full flex items-center gap-3 md:gap-4 px-4 md:px-6 py-4 text-left hover:bg-stone-50/50 transition"
                >
                  {/* Chevron */}
                  <div className="flex-shrink-0 text-stone-400">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>

                  {/* Icone source */}
                  <div className="flex-shrink-0 text-lg" title={getSourceTypeLabel(meeting.source_type)}>
                    {getSourceTypeIcon(meeting.source_type)}
                  </div>

                  {/* Titre + date */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-800 truncate">
                        {meeting.meeting_title || 'Reunion sans titre'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-stone-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(meeting.meeting_date)}
                      </span>
                      {meeting.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDurationMinutes(meeting.duration_minutes)}
                        </span>
                      )}
                      {participantsCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {participantsCount}
                        </span>
                      )}
                      {meetingItemCount > 0 && (
                        <span className="text-stone-500 font-medium">
                          {meetingItemCount} item{meetingItemCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badge extraction status */}
                  <div className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                    {statusConfig.icon}
                    <span>{statusConfig.label}</span>
                  </div>
                </button>

                {/* Expansion : resume */}
                {isExpanded && (
                  <div className="px-4 md:px-6 pb-5 pl-10 md:pl-16 space-y-3 animate-[fadeIn_0.15s_ease-out]">
                    {/* Resume */}
                    {meeting.summary ? (
                      <div>
                        <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                          Resume
                        </h4>
                        <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                          {meeting.summary}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400 italic">
                        Aucun resume disponible
                      </p>
                    )}

                    {/* Participants */}
                    {meeting.participants && meeting.participants.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                          Participants
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {meeting.participants.map((p, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-stone-100 text-stone-600 rounded"
                            >
                              {p.name}
                              {p.role && <span className="text-stone-400">({p.role})</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Extraction error */}
                    {meeting.extraction_status === 'error' && meeting.extraction_error && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">{meeting.extraction_error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Footer compteur */}
      {filteredMeetings.length > 0 && (
        <div className="flex-shrink-0 px-4 md:px-6 py-3 border-t border-stone-100 text-xs text-stone-400 text-right">
          {filteredMeetings.length} reunion{filteredMeetings.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
