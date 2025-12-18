// ============================================================
// ARPET - ChatInput Component
// Version: 2.0.0 - Ajout bouton dictée rapide
// Date: 2025-12-18
// ============================================================

import { useState, useRef, KeyboardEvent } from 'react'
import { Paperclip, Send, Mic } from 'lucide-react'
import { DictationModal } from '@/components/dictation'

interface ChatInputProps {
  onSendMessage: (content: string, files?: File[]) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ 
  onSendMessage, 
  disabled = false,
  placeholder = "De quoi avez-vous besoin ?..." 
}: ChatInputProps) {
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [showDictationModal, setShowDictationModal] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    if (!content.trim() && files.length === 0) return
    if (disabled) return

    onSendMessage(content.trim(), files.length > 0 ? files : undefined)
    setContent('')
    setFiles([])
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Envoyer avec Ctrl+Enter ou Cmd+Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...selectedFiles])
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

  // Handler pour la dictée : remplir le champ avec le transcript
  const handleDictationSendToChat = (transcript: string) => {
    setContent(transcript)
    // Focus sur le textarea
    textareaRef.current?.focus()
  }

  return (
    <>
      <div className="chat-container bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-sm rounded-xl p-4 flex flex-col gap-3">
        {/* Zone de texte */}
        <textarea 
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent outline-none text-base text-stone-700 dark:text-stone-200 placeholder-stone-300 dark:placeholder-stone-600 resize-none font-light leading-relaxed min-h-[60px] disabled:opacity-50"
          rows={2}
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
          <div className="flex items-center gap-1">
            {/* Bouton joindre fichier */}
            <button 
              onClick={handleFileSelect}
              disabled={disabled}
              className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg transition disabled:opacity-50"
              title="Joindre un fichier"
            >
              <Paperclip className="w-4.5 h-4.5" />
            </button>

            {/* Bouton dictée rapide */}
            <button 
              onClick={() => setShowDictationModal(true)}
              disabled={disabled}
              className="p-2 text-stone-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition disabled:opacity-50"
              title="Dictée rapide"
            >
              <Mic className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Input file caché */}
          <input 
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          />

          {/* Bouton envoyer */}
          <button 
            onClick={handleSubmit}
            disabled={disabled || (!content.trim() && files.length === 0)}
            className="px-4 py-1.5 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800 rounded-lg hover:bg-black dark:hover:bg-white transition font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Envoyer</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hint */}
        <p className="text-[10px] text-stone-400 dark:text-stone-500 text-right -mt-1">
          Ctrl+Entrée pour envoyer
        </p>
      </div>

      {/* Modal de dictée */}
      <DictationModal
        isOpen={showDictationModal}
        onClose={() => setShowDictationModal(false)}
        onSendToChat={handleDictationSendToChat}
      />
    </>
  )
}
