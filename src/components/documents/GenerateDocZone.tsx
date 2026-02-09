// ============================================================
// ARPET - GenerateDocZone Component - Phase 7/8
// Version: 2.0.0
// Zone de generation de documents (Memo chantier + Fiche lot)
// Affichee dans DocumentsPage quand categorie documents_generes
//
// v2.0.0 : Markdown = source de verite. Preview via MarkdownViewer,
//   export PDF a la volee au telechargement.
// v1.1.0 : Progression detaillee pendant la generation (EF + PDF)
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, HardHat, Loader2, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { generateDocument, getProjectLots } from '@/services/meeting-documents.service'
import { getFileDownloadUrl, getSourceFileById } from '@/services/documents.service'
import type { ProjectLot, GeneratedDocType, ViewerDocument } from '@/types'

interface GenerateDocZoneProps {
  projectId: string
  onDocumentGenerated: () => void
}

export function GenerateDocZone({ projectId, onDocumentGenerated }: GenerateDocZoneProps) {
  const { openViewer } = useAppStore()

  // Lots pour Fiche Lot
  const [lots, setLots] = useState<ProjectLot[]>([])
  const [lotsLoading, setLotsLoading] = useState(false)
  const [selectedLot, setSelectedLot] = useState<string | null>(null)

  // Generation state
  const [generatingMemo, setGeneratingMemo] = useState(false)
  const [generatingFiche, setGeneratingFiche] = useState(false)

  // Feedback
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Charger les lots au mount
  useEffect(() => {
    loadLots()
  }, [projectId])

  // Auto-clear success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 8000)
      return () => clearTimeout(timer)
    }
  }, [success])

  const loadLots = useCallback(async () => {
    setLotsLoading(true)
    const { data, error: err } = await getProjectLots(projectId)
    setLotsLoading(false)

    if (err) {
      console.error('Failed to load lots:', err)
      return
    }

    setLots(data || [])
  }, [projectId])

  const handleGenerate = useCallback(async (docType: GeneratedDocType) => {
    setError(null)
    setSuccess(null)

    // Validation fiche lot
    if (docType === 'fiche_lot' && !selectedLot) {
      setError('Veuillez selectionner un lot pour generer la fiche.')
      return
    }

    const setGenerating = docType === 'memo_chantier' ? setGeneratingMemo : setGeneratingFiche

    setGenerating(true)

    const { data, error: err } = await generateDocument(
      projectId,
      docType,
      docType === 'fiche_lot' ? { lot_reference: selectedLot! } : undefined,
    )

    setGenerating(false)

    if (err) {
      setError(err.message)
      return
    }

    if (data) {
      const label = docType === 'memo_chantier' ? 'Memo de chantier' : `Fiche lot ${selectedLot}`
      setSuccess(`${label} genere avec succes.`)
      onDocumentGenerated()

      // Ouvrir le preview automatiquement
      try {
        const { data: file } = await getSourceFileById(data.file_id)
        if (file?.storage_path) {
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
        }
      } catch (previewErr) {
        // Preview optionnel — pas bloquant
        if (import.meta.env.DEV) {
          console.log('[generate-doc] Preview auto failed:', previewErr)
        }
      }
    }
  }, [projectId, selectedLot, onDocumentGenerated, openViewer])

  return (
    <div className="px-6 pb-4">
      {/* Feedback messages */}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            &times;
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-400 hover:text-green-600 flex-shrink-0"
          >
            &times;
          </button>
        </div>
      )}

      {/* Cards de generation — flex stretch pour aligner les CTA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* Memo de chantier */}
        <div className={`flex flex-col bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative overflow-hidden transition-opacity ${generatingMemo ? 'opacity-80' : ''}`}>
          {generatingMemo && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-stone-100/50 to-transparent animate-[shimmer_1.5s_infinite]" />
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <ClipboardList className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Memo de chantier</h3>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed flex-1">
            Synthese globale du chantier : avancement, risques,
            decisions cles et actions ouvertes. Genere a partir
            des dernieres reunions et des items extraits.
          </p>

          <button
            onClick={() => handleGenerate('memo_chantier')}
            disabled={generatingMemo}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-4 bg-gradient-to-b from-gray-800 to-black text-white rounded-lg border-t border-gray-700 shadow-lg shadow-black/20 hover:from-gray-700 hover:to-gray-900 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingMemo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generation en cours...
              </>
            ) : (
              'Generer le memo'
            )}
          </button>
        </div>

        {/* Fiche Lot */}
        <div className={`flex flex-col bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative overflow-hidden transition-opacity ${generatingFiche ? 'opacity-80' : ''}`}>
          {generatingFiche && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-stone-100/50 to-transparent animate-[shimmer_1.5s_infinite]" />
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <HardHat className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Fiche Lot</h3>
          </div>

          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            Synthese par lot : prescriptions contractuelles (CCTP),
            decisions prises en reunion, actions en cours et
            points de vigilance.
          </p>

          {/* Dropdown lot */}
          <div className="relative mb-4">
            <select
              value={selectedLot || ''}
              onChange={(e) => setSelectedLot(e.target.value || null)}
              disabled={lotsLoading || lots.length === 0}
              className="w-full appearance-none px-3 py-2 pr-8 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {lotsLoading
                  ? 'Chargement des lots...'
                  : lots.length === 0
                    ? 'Aucun lot disponible'
                    : 'Selectionner un lot'}
              </option>
              {lots.map((lot) => (
                <option key={lot.lot_reference} value={lot.lot_reference}>
                  {lot.lot_reference}
                  {lot.company ? ` — ${lot.company}` : ''}
                  {lot.intervenant_name ? ` (${lot.intervenant_name})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <button
            onClick={() => handleGenerate('fiche_lot')}
            disabled={generatingFiche || !selectedLot}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-auto bg-gradient-to-b from-gray-800 to-black text-white rounded-lg border-t border-gray-700 shadow-lg shadow-black/20 hover:from-gray-700 hover:to-gray-900 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingFiche ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generation en cours...
              </>
            ) : (
              'Generer la fiche lot'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
