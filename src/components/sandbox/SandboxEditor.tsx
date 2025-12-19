// ============================================================
// ARPET - SandboxEditor Component
// Version: 2.0.0 - UX Refonte (modal 70%, layout adaptatif, plein écran)
// Date: 2025-12-04
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { 
  X, Pin, Trash2, Send, Bot, User, 
  Maximize2, Minimize2, RefreshCw, Edit3,
  Book, BarChart3
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { useSandboxItem } from '@/hooks/useSandbox'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
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

  // Actions du store pour dépingler
  const unpinSandboxItem = useAppStore((s) => s.unpinSandboxItem)

  // État local
  const [title, setTitle] = useState(item.title)
  const [newMessage, setNewMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPinning, setIsPinning] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Déterminer si c'est un draft ou un pinned
  const isPinned = currentItem?.status === 'pinned'

  // Déterminer le type d'agent
  const agentType = currentItem?.content.routine ? 'analyst' : 'librarian'

  // Déterminer si on a des données à afficher (pour le layout 2 colonnes)
  const hasDisplayData = currentItem?.content.display?.result_data != null

  // Mettre à jour l'état local quand l'item change
  useEffect(() => {
    if (currentItem) {
      setTitle(currentItem.title)
    }
  }, [currentItem])

  // Scroll vers le bas des messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentItem?.content.messages])

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false)
        } else {
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose, isFullscreen])

  // ========================================
  // HANDLERS
  // ========================================

  const handleSaveTitle = async () => {
    if (isSaving || title === currentItem?.title) return
    setIsSaving(true)

    try {
      const updatedItem = await update({ title })
      if (updatedItem) {
        onUpdate?.(updatedItem)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handlePin = async () => {
    if (isPinning) return
    setIsPinning(true)

    try {
      const pinnedItem = await pin()
      if (pinnedItem) {
        onUpdate?.(pinnedItem)
      }
    } finally {
      setIsPinning(false)
    }
  }

  const handleUnpin = async () => {
    if (isPinning || !currentItem) return
    setIsPinning(true)

    try {
      const unpinnedItem = await unpinSandboxItem(currentItem.id)
      if (unpinnedItem) {
        onUpdate?.(unpinnedItem)
      }
    } finally {
      setIsPinning(false)
    }
  }

  const handleRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)

    try {
      // TODO: Appeler l'agent analytique pour rafraîchir les données
      // Pour l'instant, simulation
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock: mettre à jour la date de dernier rafraîchissement
      if (currentItem) {
        const updatedContent = {
          ...currentItem.content,
          display: {
            ...currentItem.content.display,
            last_run_at: new Date().toISOString()
          }
        }
        const updatedItem = await update({ content: updatedContent })
        if (updatedItem) {
          onUpdate?.(updatedItem)
        }
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDelete = async () => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    setShowDeleteConfirm(false)
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

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    await addMessage('user', newMessage.trim())
    setNewMessage('')

    // Simuler réponse agent (MOCK)
    setTimeout(async () => {
      await addMessage('agent', generateMockAgentResponse(newMessage))
    }, 1000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const messages = currentItem?.content.messages || []

  // ========================================
  // RENDER
  // ========================================

  // Config agent
  const agentConfig = agentType === 'analyst' 
    ? { icon: <BarChart3 className="w-4 h-4" />, label: 'Analytique', color: 'text-orange-600 bg-orange-50' }
    : { icon: <Book className="w-4 h-4" />, label: 'Bibliothécaire', color: 'text-blue-600 bg-blue-50' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`
        relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden
        transition-all duration-300 ease-out
        ${isFullscreen 
          ? 'w-full h-full max-w-full max-h-full rounded-none' 
          : 'w-[70vw] h-[70vh] max-w-5xl'
        }
      `}>
        
        {/* ========================================
            HEADER
        ======================================== */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Badge Agent */}
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${agentConfig.color}`}>
              {agentConfig.icon}
              <span>{agentConfig.label}</span>
            </div>

            {/* Badge Status */}
            {isPinned ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-600">
                <Pin className="w-3 h-3" />
                Épinglé
              </span>
            ) : (
              <span className="text-xs text-stone-400">Brouillon</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Bouton Plein écran */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition"
              title={isFullscreen ? 'Réduire' : 'Plein écran'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
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

        {/* ========================================
            CONTENT
        ======================================== */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full text-stone-400">
              Chargement...
            </div>
          ) : (
            <div className={`
              h-full
              ${hasDisplayData && !isFullscreen 
                ? 'grid grid-cols-2 divide-x divide-stone-100' 
                : 'flex flex-col'
              }
            `}>
              
              {/* ========================================
                  ZONE RÉSULTAT (si données présentes)
              ======================================== */}
              {hasDisplayData && (
                <div className={`
                  overflow-auto p-6
                  ${isFullscreen ? 'flex-1' : ''}
                `}>
                  <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-4">
                    Résultat
                  </h3>
                  
                  {/* Affichage du résultat (mock) */}
                  <div className="bg-stone-50 rounded-lg p-4 min-h-[200px]">
                    {currentItem?.content.display.result_type === 'table' ? (
                      <div className="text-sm text-stone-600">
                        [Tableau de données]
                        <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto">
                          {JSON.stringify(currentItem.content.display.result_data, null, 2)}
                        </pre>
                      </div>
                    ) : currentItem?.content.display.result_type === 'chart' ? (
                      <div className="text-sm text-stone-600">
                        [Graphique]
                        <div className="mt-2 h-48 bg-gradient-to-br from-blue-100 to-blue-50 rounded flex items-center justify-center text-blue-400">
                          📊 Zone graphique
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-stone-600">
                        {String(currentItem?.content.display.result_data || 'Aucun résultat')}
                      </div>
                    )}
                  </div>

                  {/* Date dernier rafraîchissement */}
                  {currentItem?.content.display.last_run_at && (
                    <p className="text-xs text-stone-400 mt-3">
                      Dernière mise à jour : {new Date(currentItem.content.display.last_run_at).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
              )}

              {/* ========================================
                  ZONE CONVERSATION
              ======================================== */}
              {!isFullscreen && (
                <div className="flex flex-col h-full overflow-hidden">
                  {/* Titre éditable */}
                  <div className="px-6 pt-6 pb-4 border-b border-stone-50 flex-shrink-0">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={handleSaveTitle}
                      className="w-full text-lg font-medium text-stone-800 bg-transparent border-none outline-none focus:ring-0 placeholder-stone-300"
                      placeholder="Titre..."
                    />
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {messages.length === 0 ? (
                      <p className="text-sm text-stone-400 text-center py-8">
                        {isPinned 
                          ? 'Cliquez sur "Éditer" pour modifier ce rapport'
                          : 'Posez une question pour démarrer'
                        }
                      </p>
                    ) : (
                      messages.map((msg, index) => (
                        <MessageBubble key={index} message={msg} />
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input (seulement pour les drafts) */}
                  {!isPinned && (
                    <div className="px-6 py-4 border-t border-stone-100 flex-shrink-0">
                      <div className="flex gap-2">
                        <textarea
                          ref={inputRef}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={handleKeyDown}
                          rows={2}
                          className="flex-1 px-4 py-2.5 text-sm text-stone-700 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition resize-none"
                          placeholder="Votre message... (Ctrl+Entrée)"
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
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================
            FOOTER - Actions
        ======================================== */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100 bg-stone-50 flex-shrink-0">
          {/* Actions gauche */}
          <div className="flex items-center gap-2">
            {isPinned ? (
              <>
                {/* Rafraîchir */}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Rafraîchissement...' : 'Rafraîchir'}
                </button>

                {/* Éditer (dépingler) */}
                <button
                  onClick={handleUnpin}
                  disabled={isPinning}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition text-sm font-medium disabled:opacity-50"
                >
                  <Edit3 className="w-4 h-4" />
                  Éditer
                </button>
              </>
            ) : (
              <>
                {/* Épingler */}
                <button
                  onClick={handlePin}
                  disabled={isPinning}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50"
                >
                  <Pin className={`w-4 h-4 ${isPinning ? 'animate-pulse' : ''}`} />
                  {isPinning ? 'Épinglage...' : 'Épingler'}
                </button>
              </>
            )}
          </div>

          {/* Actions droite */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </button>
        </div>
      </div>

      {/* Dialog de confirmation suppression */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Supprimer cet élément ?"
        message="Cette action est irréversible. L'élément sera définitivement supprimé."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}

// ============================================
// Message Bubble
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
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        ${isAgent ? 'bg-stone-800 text-white' : 'bg-stone-200 text-stone-600'}
      `}>
        {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      <div className={`
        max-w-[80%] px-4 py-2.5 rounded-xl text-sm
        ${isAgent 
          ? 'bg-stone-100 text-stone-700 rounded-tl-none' 
          : 'bg-stone-800 text-white rounded-tr-none'}
      `}>
        <p className="whitespace-pre-wrap">{message.text}</p>
        <span className={`block text-[10px] mt-1 ${isAgent ? 'text-stone-400' : 'text-stone-400'}`}>
          {time}
        </span>
      </div>
    </div>
  )
}

// ============================================
// Mock Response
// ============================================

function generateMockAgentResponse(question: string): string {
  const lower = question.toLowerCase()

  if (lower.includes('tableau') || lower.includes('budget')) {
    return `Voici le tableau demandé :

| Lot | Budget | Consommé | Reste |
|-----|--------|----------|-------|
| Gros Œuvre | 150 000€ | 120 000€ | 30 000€ |
| Second Œuvre | 80 000€ | 45 000€ | 35 000€ |

Souhaitez-vous que j'affine ces données ?`
  }

  if (lower.includes('graphique') || lower.includes('évolution')) {
    return `J'ai généré un graphique d'évolution. Vous pouvez le voir dans la zone de résultat à gauche.

Les données montrent une progression de 15% par rapport au mois dernier.`
  }

  return `Bien reçu ! Je traite votre demande : "${question.substring(0, 50)}..."

Cette fonctionnalité sera connectée à l'agent RAG prochainement.`
}
