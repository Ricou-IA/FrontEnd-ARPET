// ============================================================
// ARPET - SandboxEditor Component
// Version: 1.0.0 - Modal d'édition pour les sandbox items
// Date: 2025-12-04
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { X, Save, Pin, Trash2, Send, Bot, User } from 'lucide-react'
import { useSandboxItem } from '@/hooks/useSandbox'
import type { SandboxItem, SandboxMessage } from '@/types'

interface SandboxEditorProps {
  item: SandboxItem
  onClose: () => void
  onUpdate?: (updatedItem: SandboxItem) => void
  onDelete?: () => void
}

export function SandboxEditor({ item, onClose, onUpdate, onDelete }: SandboxEditorProps) {
  const {
    item: currentItem,
    loading,
    update,
    addMessage,
    pin,
    remove,
  } = useSandboxItem(item.id)

  // État local pour l'édition
  const [title, setTitle] = useState(item.title)
  const [objective, setObjective] = useState(item.content.objective || '')
  const [newMessage, setNewMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPinning, setIsPinning] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Mettre à jour l'état local quand l'item change
  useEffect(() => {
    if (currentItem) {
      setTitle(currentItem.title)
      setObjective(currentItem.content.objective || '')
    }
  }, [currentItem])

  // Scroll vers le bas quand un nouveau message arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentItem?.content.messages])

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Sauvegarder les modifications
  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)

    try {
      const updatedItem = await update({
        title,
        content: {
          ...currentItem?.content,
          objective,
        },
      })

      if (updatedItem) {
        onUpdate?.(updatedItem)
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Épingler l'item
  const handlePin = async () => {
    if (isPinning) return
    setIsPinning(true)

    try {
      const pinnedItem = await pin()
      if (pinnedItem) {
        onUpdate?.(pinnedItem)
        onClose()
      }
    } finally {
      setIsPinning(false)
    }
  }

  // Supprimer l'item
  const handleDelete = async () => {
    if (!window.confirm('Supprimer définitivement ce brouillon ?')) return
    if (isDeleting) return
    setIsDeleting(true)

    try {
      const success = await remove()
      if (success) {
        onDelete?.()
        onClose()
      }
    } finally {
      setIsDeleting(false)
    }
  }

  // Envoyer un message (mock pour l'instant)
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    // Ajouter le message utilisateur
    await addMessage('user', newMessage.trim())
    setNewMessage('')

    // Simuler une réponse de l'agent (MOCK)
    setTimeout(async () => {
      await addMessage('agent', generateMockAgentResponse(newMessage))
    }, 1000)
  }

  // Raccourci Ctrl+Enter pour envoyer
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const messages = currentItem?.content.messages || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden mx-4">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="text-xs font-semibold uppercase text-stone-500 tracking-wider">
              Brouillon
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Bouton Épingler */}
            <button
              onClick={handlePin}
              disabled={isPinning}
              className="p-2 text-stone-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
              title="Épingler dans l'Espace de Travail"
            >
              <Pin className={`w-4 h-4 ${isPinning ? 'animate-pulse' : ''}`} />
            </button>

            {/* Bouton Supprimer */}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
              title="Supprimer"
            >
              <Trash2 className={`w-4 h-4 ${isDeleting ? 'animate-pulse' : ''}`} />
            </button>

            {/* Bouton Fermer */}
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-stone-400">
              Chargement...
            </div>
          ) : (
            <div className="p-6 space-y-6">
              
              {/* Titre éditable */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                  Titre
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-lg font-medium text-stone-800 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition"
                  placeholder="Titre du brouillon..."
                />
              </div>

              {/* Objectif */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                  Objectif
                </label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 text-sm text-stone-700 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition resize-none"
                  placeholder="Décrivez l'objectif de cette analyse..."
                />
              </div>

              {/* Bouton Sauvegarder */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-black transition text-sm font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>

              {/* Séparateur */}
              <div className="border-t border-stone-100 pt-6">
                <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-4">
                  Conversation avec l'Agent
                </h3>

                {/* Messages */}
                <div className="space-y-4 mb-4 max-h-64 overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-sm text-stone-400 text-center py-8">
                      Posez une question pour démarrer la conversation
                    </p>
                  ) : (
                    messages.map((msg, index) => (
                      <MessageBubble key={index} message={msg} />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input message */}
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    className="flex-1 px-4 py-2.5 text-sm text-stone-700 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition resize-none"
                    placeholder="Posez une question à l'agent... (Ctrl+Entrée pour envoyer)"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2.5 bg-stone-800 text-white rounded-lg hover:bg-black transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Message Bubble Component
// ============================================

interface MessageBubbleProps {
  message: SandboxMessage
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isAgent = message.role === 'agent'
  const time = new Date(message.at).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex gap-3 ${isAgent ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        ${isAgent ? 'bg-stone-800 text-white' : 'bg-stone-200 text-stone-600'}
      `}>
        {isAgent ? (
          <Bot className="w-4 h-4" />
        ) : (
          <User className="w-4 h-4" />
        )}
      </div>

      {/* Contenu */}
      <div className={`
        max-w-[80%] px-4 py-2.5 rounded-xl text-sm
        ${isAgent 
          ? 'bg-stone-100 text-stone-700 rounded-tl-none' 
          : 'bg-stone-800 text-white rounded-tr-none'}
      `}>
        <p className="whitespace-pre-wrap">{message.text}</p>
        <span className={`
          block text-[10px] mt-1
          ${isAgent ? 'text-stone-400' : 'text-stone-400'}
        `}>
          {time}
        </span>
      </div>
    </div>
  )
}

// ============================================
// Mock Agent Response (temporaire)
// ============================================

function generateMockAgentResponse(question: string): string {
  const lowerQuestion = question.toLowerCase()

  if (lowerQuestion.includes('cctp') || lowerQuestion.includes('document')) {
    return `J'ai analysé les documents disponibles. Voici ce que j'ai trouvé :

- Le CCTP mentionne une épaisseur d'isolant de 120mm
- Le DTU 45.1 recommande 140mm minimum

Souhaitez-vous que je génère un tableau comparatif ?`
  }

  if (lowerQuestion.includes('planning') || lowerQuestion.includes('retard')) {
    return `D'après le planning actuel :

- Lot Gros Œuvre : 3 jours de retard
- Cause principale : intempéries semaine 48
- Impact sur le second œuvre : démarrage décalé au 15/12

Je peux créer un planning de rattrapage si besoin.`
  }

  return `Bien reçu ! Je suis en train d'analyser votre demande concernant "${question.substring(0, 50)}..."

Cette fonctionnalité sera connectée à l'agent RAG dans une prochaine version. Pour l'instant, je simule les réponses.

Que souhaitez-vous explorer ensuite ?`
}
