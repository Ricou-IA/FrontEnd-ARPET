// ============================================================
// ARPET - SaveConversationModal Component
// Version: 1.0.0 - Modale pour sauvegarder une conversation
// Date: 2025-12-19
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { X, Save, Loader2 } from 'lucide-react'

interface SaveConversationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (title: string) => Promise<void>
  defaultTitle?: string
}

export function SaveConversationModal({ 
  isOpen, 
  onClose, 
  onSave,
  defaultTitle = ''
}: SaveConversationModalProps) {
  const [title, setTitle] = useState(defaultTitle)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus sur l'input à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle)
      setError(null)
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isOpen, defaultTitle])

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Veuillez entrer un titre')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSave(title.trim())
      onClose()
    } catch (err) {
      console.error('Erreur sauvegarde:', err)
      setError('Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSaving) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div 
        className="relative bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-md transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Save className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                Sauvegarder la conversation
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Donnez un titre pour la retrouver facilement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
            Titre de la conversation
          </label>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Question sur le DTU 31.2..."
            disabled={isSaving}
            className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-700 dark:text-stone-300 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50"
          />

          {error && (
            <p className="mt-2 text-sm text-red-500 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Sauvegarder
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SaveConversationModal
