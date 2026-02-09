// ============================================================
// ARPET - ChatInput Component
// Version: 4.0.0 - Remplacement dictée par mémo vocal
// Date: 2026-02-06
// ============================================================

import { useState, useRef, KeyboardEvent } from 'react'
import { Paperclip, Send, Mic, Sparkles, Save, Layers } from 'lucide-react'
import { MemoModal } from '@/components/meeting'
import { CrossRefWizard, type WizardSubmitResult } from './CrossRefWizard'

interface ChatInputProps {
  onSendMessage: (content: string, files?: File[], deepAnalysis?: boolean) => void
  onWizardSubmit?: (result: WizardSubmitResult) => void
  onSaveConversation?: () => void
  disabled?: boolean
  placeholder?: string
  /** ID du projet actif (pour mémo vocal et wizard) */
  projectId?: string | null
  /** ID de l'organisation (pour mémo vocal) */
  orgId?: string | null
  /** Nom du projet (pour affichage dans mémo modal) */
  projectName?: string | null
}

export function ChatInput({
  onSendMessage,
  onWizardSubmit,
  onSaveConversation,
  disabled = false,
  placeholder = "De quoi avez-vous besoin ?...",
  projectId,
  orgId,
  projectName,
}: ChatInputProps) {
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [showMemoModal, setShowMemoModal] = useState(false)
  const [isDeepAnalysis, setIsDeepAnalysis] = useState(false)
  const [showWizard, setShowWizard] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const expertFileInputRef = useRef<HTMLInputElement>(null)
  const standardFileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    if (!content.trim() && files.length === 0) return
    if (disabled) return

    onSendMessage(content.trim(), files.length > 0 ? files : undefined, isDeepAnalysis)
    setContent('')
    setFiles([])
    setIsDeepAnalysis(false)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Entrée seule = envoyer le message
    // Shift+Entrée = nouvelle ligne
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleExpertFileSelect = () => {
    setIsDeepAnalysis(true)
    expertFileInputRef.current?.click()
  }

  const handleStandardFileSelect = () => {
    setIsDeepAnalysis(false)
    standardFileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isExpert: boolean) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...selectedFiles])
    if (isExpert) {
      setIsDeepAnalysis(true)
    }
    // Reset input
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)

    // Auto-resize
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }

  // Handler wizard submit : ferme le wizard et remonte le resultat
  const handleWizardSubmit = (result: WizardSubmitResult) => {
    setShowWizard(false)
    onWizardSubmit?.(result)
  }

  // Afficher le bouton wizard seulement si callback et projet actif
  const showWizardButton = !!onWizardSubmit && !!projectId

  // Le bouton mémo est actif seulement si un projet est sélectionné
  const canRecordMemo = !!projectId && !!orgId

  return (
    <>
      <div className="relative">
        {/* Wizard Cross-Ref (popover au-dessus) */}
        {showWizardButton && (
          <CrossRefWizard
            isOpen={showWizard}
            onClose={() => setShowWizard(false)}
            onSubmit={handleWizardSubmit}
            projectId={projectId || null}
            disabled={disabled}
          />
        )}

        <div className="chat-container bg-transparent border-0 shadow-none rounded-none p-0 flex flex-col gap-3">
          {/* Zone de texte - Compacte (1 ligne) avec auto-expansion */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent outline-none text-base text-stone-700 dark:text-stone-200 placeholder-stone-300 dark:placeholder-stone-600 resize-none font-light leading-relaxed min-h-[24px] disabled:opacity-50"
            rows={1}
          />

          {/* Fichiers attachés */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400"
                >
                  <Paperclip className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-stone-400 hover:text-red-500 ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Barre d'actions */}
          <div className="flex justify-between items-center border-t border-stone-50 dark:border-stone-800 pt-3">
            {/* Boutons gauche */}
            <div className="flex items-center gap-2">
              {/* Bouton Expert - Analyse approfondie */}
              <button
                onClick={handleExpertFileSelect}
                disabled={disabled}
                className="p-2 text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition disabled:opacity-50"
                title="Analyser et Indexer (CCTP, Normes...)"
              >
                <Sparkles className="w-4.5 h-4.5" />
              </button>

              {/* Bouton Standard - Upload simple */}
              <button
                onClick={handleStandardFileSelect}
                disabled={disabled}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition disabled:opacity-50"
                title="Joindre simplement"
              >
                <Paperclip className="w-4.5 h-4.5" />
              </button>

              {/* Bouton mémo vocal */}
              <button
                onClick={() => setShowMemoModal(true)}
                disabled={disabled || !canRecordMemo}
                className={`p-2 rounded-lg transition disabled:opacity-50 ${
                  canRecordMemo
                    ? 'text-stone-400 hover:text-red-500 dark:hover:text-red-400'
                    : 'text-stone-300 cursor-not-allowed'
                }`}
                title={canRecordMemo ? 'Mémo vocal' : 'Sélectionnez un chantier pour enregistrer un mémo'}
              >
                <Mic className="w-4.5 h-4.5" />
              </button>

              {/* Bouton Wizard Cross-Ref */}
              {showWizardButton && (
                <button
                  onClick={() => setShowWizard(prev => !prev)}
                  disabled={disabled}
                  className={`p-2 rounded-lg transition disabled:opacity-50 ${
                    showWizard
                      ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'text-stone-400 hover:text-indigo-500 dark:hover:text-indigo-400'
                  }`}
                  title="Recherche croisée"
                >
                  <Layers className="w-4.5 h-4.5" />
                </button>
              )}

              {/* Séparateur vertical */}
              {onSaveConversation && (
                <div className="h-5 w-px bg-stone-200 dark:bg-stone-700 mx-1" />
              )}

              {/* Bouton sauvegarder conversation */}
              {onSaveConversation && (
                <button
                  onClick={onSaveConversation}
                  disabled={disabled}
                  className="p-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg transition disabled:opacity-50"
                  title="Sauvegarder la conversation"
                >
                  <Save className="w-4.5 h-4.5" />
                </button>
              )}
            </div>

            {/* Inputs file cachés */}
            <input
              ref={expertFileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileChange(e, true)}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            />
            <input
              ref={standardFileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileChange(e, false)}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            />

            {/* Hint + Bouton envoyer */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-stone-400 dark:text-stone-500">
                Shift+Entrée pour nouvelle ligne
              </span>
              <button
                onClick={handleSubmit}
                disabled={disabled || (!content.trim() && files.length === 0)}
                className="px-4 py-1.5 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800 rounded-lg hover:bg-black dark:hover:bg-white transition font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Envoyer</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal mémo vocal */}
      <MemoModal
        isOpen={showMemoModal}
        onClose={() => setShowMemoModal(false)}
        projectId={projectId || null}
        orgId={orgId || null}
        projectName={projectName}
      />
    </>
  )
}
