// ============================================================
// CrossRefWizard Component
// Panneau popover pour formuler des questions cross-ref
// 3 etapes : Sujet → Lot → Mode d'analyse
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ArrowLeftRight, CheckCircle, FileText, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import { getCrossRefMetadata, type CrossRefMetadata } from '@/services/documents'
import type { CrossRefMode } from '@/services/chat/chat-types'

// ============================================================
// TYPES
// ============================================================

export interface WizardSubmitResult {
  query: string
  cross_ref_mode: CrossRefMode
  detected_documents: string[]
  subject: string
  lot: string | null
}

interface CrossRefWizardProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (result: WizardSubmitResult) => void
  projectId: string | null
  disabled?: boolean
}

// ============================================================
// CONSTANTES
// ============================================================

const MODE_OPTIONS: Array<{
  mode: CrossRefMode
  label: string
  description: string
  icon: typeof ArrowLeftRight
  colorClass: string
  selectedBorder: string
}> = [
  {
    mode: 'compare',
    label: 'Comparer les prescriptions',
    description: 'Mettre en regard les exigences du CCTP et des normes',
    icon: ArrowLeftRight,
    colorClass: 'hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    selectedBorder: 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30',
  },
  {
    mode: 'compliance',
    label: 'V\u00e9rifier la conformit\u00e9',
    description: 'V\u00e9rifier que les prescriptions respectent les normes',
    icon: CheckCircle,
    colorClass: 'hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
    selectedBorder: 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
  },
  {
    mode: 'synthesize',
    label: 'Synth\u00e9tiser les obligations',
    description: 'R\u00e9sumer toutes les obligations pour ce sujet',
    icon: FileText,
    colorClass: 'hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20',
    selectedBorder: 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30',
  },
]

// ============================================================
// HELPERS
// ============================================================

function generateQuery(
  subject: string,
  lot: string | null,
  mode: CrossRefMode,
): string {
  const lotSuffix = lot ? ` du lot ${lot}` : ''

  switch (mode) {
    case 'compare':
      return `Compare les prescriptions${lotSuffix} concernant ${subject} entre le CCTP et les normes applicables`
    case 'compliance':
      return `V\u00e9rifie la conformit\u00e9 des prescriptions${lotSuffix} concernant ${subject} par rapport aux DTU et normes applicables`
    case 'synthesize':
      return `Synth\u00e9tise les obligations${lotSuffix} concernant ${subject} dans les documents du march\u00e9`
  }
}

// ============================================================
// COMPOSANT
// ============================================================

export function CrossRefWizard({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  disabled = false,
}: CrossRefWizardProps) {
  // State wizard
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [subject, setSubject] = useState('')
  const [selectedLot, setSelectedLot] = useState<string | null>(null)
  const [selectedMode, setSelectedMode] = useState<CrossRefMode | null>(null)

  // State data
  const [metadata, setMetadata] = useState<CrossRefMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [cachedProjectId, setCachedProjectId] = useState<string | null>(null)

  // Refs
  const panelRef = useRef<HTMLDivElement>(null)
  const subjectInputRef = useRef<HTMLInputElement>(null)

  // Fetch metadata quand le wizard s'ouvre
  useEffect(() => {
    if (!isOpen || !projectId) return
    // Cache : ne pas re-fetch si meme projet
    if (metadata && cachedProjectId === projectId) return

    setIsLoading(true)
    getCrossRefMetadata(projectId).then(({ data, error }) => {
      if (error) {
        console.error('[CrossRefWizard] Erreur chargement metadata:', error)
      }
      setMetadata(data)
      setCachedProjectId(projectId)
      setIsLoading(false)
    })
  }, [isOpen, projectId, metadata, cachedProjectId])

  // Focus input sujet a l'ouverture
  useEffect(() => {
    if (isOpen && step === 1) {
      // Petit delai pour laisser le rendu se faire
      const timer = setTimeout(() => subjectInputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, step])

  // Fermeture Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Fermeture clic exterieur
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delai pour eviter la fermeture immediate au clic d'ouverture
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Reset a la fermeture
  useEffect(() => {
    if (!isOpen) {
      setStep(1)
      setSubject('')
      setSelectedLot(null)
      setSelectedMode(null)
    }
  }, [isOpen])

  // Handlers
  const handleNextFromSubject = useCallback(() => {
    if (!subject.trim()) return
    // Si pas de lots disponibles, sauter l'etape 2
    if (!metadata?.lots || metadata.lots.length === 0) {
      setStep(3)
    } else {
      setStep(2)
    }
  }, [subject, metadata])

  const handleNextFromLot = useCallback(() => {
    setStep(3)
  }, [])

  const handleBack = useCallback(() => {
    if (step === 3 && metadata?.lots && metadata.lots.length > 0) {
      setStep(2)
    } else {
      setStep(1)
    }
  }, [step, metadata])

  const handleSubmit = useCallback(() => {
    if (!selectedMode || !subject.trim()) return

    const query = generateQuery(subject.trim(), selectedLot, selectedMode)
    const detected_documents = metadata?.documents.map(d => d.name) || []

    onSubmit({
      query,
      cross_ref_mode: selectedMode,
      detected_documents,
      subject: subject.trim(),
      lot: selectedLot,
    })

    onClose()
  }, [selectedMode, subject, selectedLot, metadata, onSubmit, onClose])

  const handleNormChipClick = useCallback((norm: string) => {
    setSubject(prev => {
      if (prev.trim().length === 0) return norm
      return `${prev}, ${norm}`
    })
    subjectInputRef.current?.focus()
  }, [])

  const handleSubjectKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleNextFromSubject()
    }
  }, [handleNextFromSubject])

  // ============================================================
  // RENDU
  // ============================================================

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full mb-2 left-0 right-0 z-50 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl rounded-2xl shadow-lg border border-stone-200 dark:border-stone-700 p-5 transition-opacity duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
            Recherche crois\u00e9e
          </h3>
          <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">
            \u00c9tape {step}/3
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-stone-400 animate-spin" />
          <span className="ml-2 text-sm text-stone-400">Chargement des donn\u00e9es du projet...</span>
        </div>
      )}

      {/* Contenu */}
      {!isLoading && (
        <>
          {/* ---- ETAPE 1 : Sujet ---- */}
          {step === 1 && (
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-2">
                Quel est le sujet ?
              </label>
              <input
                ref={subjectInputRef}
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onKeyDown={handleSubjectKeyDown}
                placeholder="Ex: isolation acoustique des cloisons"
                disabled={disabled}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm text-stone-700 dark:text-stone-300 placeholder-stone-300 dark:placeholder-stone-600 outline-none focus:border-indigo-300 dark:focus:border-indigo-600 transition disabled:opacity-50"
              />

              {/* Chips normes pour inspiration */}
              {metadata?.norms && metadata.norms.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 mb-1.5">
                    Normes r\u00e9f\u00e9renc\u00e9es dans le projet :
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {metadata.norms.slice(0, 12).map((norm) => (
                      <button
                        key={norm}
                        onClick={() => handleNormChipClick(norm)}
                        className="px-2 py-0.5 rounded-full text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 border border-stone-200 dark:border-stone-700 transition"
                      >
                        {norm}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bouton suivant */}
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleNextFromSubject}
                  disabled={disabled || !subject.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800 rounded-lg hover:bg-black dark:hover:bg-white transition text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Suivant</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ---- ETAPE 2 : Lot ---- */}
          {step === 2 && (
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-2">
                Quel lot est concern\u00e9 ?
              </label>

              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {/* Option "Tous les lots" */}
                <button
                  onClick={() => setSelectedLot(null)}
                  className={`
                    flex items-center px-3 py-2 rounded-lg border text-left transition-all duration-150 text-sm
                    ${selectedLot === null
                      ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                    }
                  `}
                >
                  Tous les lots
                </button>

                {metadata?.lots.map((lot) => (
                  <button
                    key={lot}
                    onClick={() => setSelectedLot(lot)}
                    className={`
                      flex items-center px-3 py-2 rounded-lg border text-left transition-all duration-150 text-sm
                      ${selectedLot === lot
                        ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                      }
                    `}
                  >
                    {lot}
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition text-sm"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Retour</span>
                </button>
                <button
                  onClick={handleNextFromLot}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800 rounded-lg hover:bg-black dark:hover:bg-white transition text-sm font-medium"
                >
                  <span>Suivant</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ---- ETAPE 3 : Mode d'analyse ---- */}
          {step === 3 && (
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-2">
                Que voulez-vous savoir ?
              </label>

              <div className="flex flex-col gap-1.5">
                {MODE_OPTIONS.map((opt) => {
                  const Icon = opt.icon
                  const isSelected = selectedMode === opt.mode
                  return (
                    <button
                      key={opt.mode}
                      onClick={() => setSelectedMode(opt.mode)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all duration-150
                        ${isSelected
                          ? opt.selectedBorder
                          : `border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 ${opt.colorClass}`
                        }
                      `}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-stone-700 dark:text-stone-300' : 'text-stone-400 dark:text-stone-500'}`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-stone-700 dark:text-stone-300 block">
                          {opt.label}
                        </span>
                        <span className="text-[10px] text-stone-400 dark:text-stone-500 block mt-0.5">
                          {opt.description}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Apercu de la question generee */}
              {selectedMode && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 mb-1">
                    Question g\u00e9n\u00e9r\u00e9e :
                  </p>
                  <p className="text-xs text-stone-600 dark:text-stone-400 italic">
                    {generateQuery(subject.trim(), selectedLot, selectedMode)}
                  </p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-4">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition text-sm"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Retour</span>
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={disabled || !selectedMode}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Lancer l'analyse</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
