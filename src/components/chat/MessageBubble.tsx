// ============================================================
// ARPET - MessageBubble Component v2.1
// Version: 2.1.0 - Fix: bouton Ancré ouvre la carte Sandbox
// Date: 2025-01-XX
// ============================================================

import { useState } from 'react'
import { Bookmark, Copy, ThumbsUp, ThumbsDown, Zap, Check, AlertCircle, ExternalLink } from 'lucide-react'
import type { Message, MessageSource } from '../../types'
import { getAuthorityBadge } from '../../types'
import * as voteService from '../../services/vote.service'
import { useAuth } from '../../hooks/useAuth'

interface MessageBubbleProps {
  message: Message
  onAnchor?: (message: Message) => void
  onOpenSandboxItem?: (sandboxItemId: string) => void  // Nouveau: ouvrir la carte
  onVoteComplete?: (message: Message, voteType: 'up' | 'down', qaId?: string) => void
}

export function MessageBubble({ message, onAnchor, onOpenSandboxItem, onVoteComplete }: MessageBubbleProps) {
  const { profile } = useAuth()
  const [isVoting, setIsVoting] = useState(false)
  const [voteStatus, setVoteStatus] = useState<'none' | 'up' | 'down'>(message.user_vote || 'none')
  const [voteError, setVoteError] = useState<string | null>(null)
  const [localValidationCount, setLocalValidationCount] = useState(message.validation_count || 0)
  // État local pour suivre l'ancrage et l'ID du sandbox item créé
  const isAnchored = message.isAnchored || false
  const sandboxItemId = message.sandboxItemId || null

  // Message utilisateur
  if (message.role === 'user') {
    return (
      <div className="flex gap-4 justify-end">
        <div className="max-w-2xl">
          <div className="text-sm text-stone-700 leading-relaxed bg-stone-100 p-4 rounded-l-xl rounded-br-xl">
            <p>{message.content}</p>
          </div>
        </div>
      </div>
    )
  }

  // Handlers
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
  }

  const handleAnchorClick = () => {
    if (isAnchored && sandboxItemId && onOpenSandboxItem) {
      // Déjà ancré → ouvrir la carte
      onOpenSandboxItem(sandboxItemId)
    } else if (!isAnchored && onAnchor) {
      // Pas encore ancré → ancrer
      onAnchor(message)
    }
  }

  const handleVoteUp = async () => {
    if (isVoting || voteStatus !== 'none') return
    
    setIsVoting(true)
    setVoteError(null)

    try {
      // Vérifier si c'est une qa_memory existante ou une nouvelle réponse
      const existingQaId = message.sources?.find(s => s.qa_id)?.qa_id

      if (existingQaId) {
        // Vote sur qa_memory existante
        const result = await voteService.voteUp(existingQaId)
        
        if (result.success) {
          setVoteStatus('up')
          setLocalValidationCount(prev => prev + 1)
          onVoteComplete?.(message, 'up', existingQaId)
        } else {
          setVoteError(result.message)
        }
      } else if (message.vote_context && profile?.org_id) {
        // Créer nouvelle qa_memory + vote
        const result = await voteService.voteUpNewAnswer(
          message.vote_context,
          profile.org_id,
          profile.vertical_id ? [profile.vertical_id] : undefined
        )

        if (result.success) {
          setVoteStatus('up')
          setLocalValidationCount(prev => prev + 1)
          // result contient qa_id car c'est le type étendu
          const qaId = 'qa_id' in result ? result.qa_id : undefined
          onVoteComplete?.(message, 'up', qaId)
        } else {
          setVoteError(result.message)
        }
      } else {
        setVoteError('Impossible de voter')
      }
    } catch (err) {
      setVoteError('Erreur lors du vote')
      console.error('Vote error:', err)
    } finally {
      setIsVoting(false)
    }
  }

  const handleVoteDown = async () => {
    if (isVoting || voteStatus !== 'none') return
    
    setIsVoting(true)
    setVoteError(null)

    try {
      const existingQaId = message.sources?.find(s => s.qa_id)?.qa_id

      if (existingQaId) {
        const result = await voteService.voteDown(existingQaId)
        
        if (result.success) {
          setVoteStatus('down')
          setLocalValidationCount(prev => Math.max(0, prev - 1))
          onVoteComplete?.(message, 'down')
        } else {
          setVoteError(result.message)
        }
      } else {
        // Pour une nouvelle réponse, on ne peut pas voter négatif (pas de qa_memory)
        setVoteError('Vote négatif non disponible pour les nouvelles réponses')
      }
    } catch (err) {
      setVoteError('Erreur lors du signalement')
      console.error('Vote error:', err)
    } finally {
      setIsVoting(false)
    }
  }

  // Render du header selon knowledge_type
  const renderKnowledgeHeader = () => {
    const { knowledge_type } = message

    if (knowledge_type === 'expert_validated') {
      return (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-100">
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            ⭐ Réponse Expert
          </span>
          {localValidationCount > 0 && (
            <span className="text-[10px] text-stone-400 font-medium">
              Validée par {localValidationCount} expert{localValidationCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )
    }

    if (knowledge_type === 'team_validated') {
      return (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-100">
          <span className="bg-green-50 text-green-700 border border-green-200 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <Check className="w-2.5 h-2.5" />
            Validée par l'équipe
          </span>
          {localValidationCount > 0 && (
            <span className="text-[10px] text-stone-400 font-medium">
              {localValidationCount} validation{localValidationCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )
    }

    if (knowledge_type === 'shared') {
      return (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-100">
          <span className="bg-green-50 text-green-700 border border-green-100 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" />
            Savoir Partagé
          </span>
          {localValidationCount > 0 && (
            <span className="text-[10px] text-stone-400 font-medium">
              Validé par {localValidationCount} conducteur{localValidationCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )
    }

    if (knowledge_type === 'project') {
      return (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-100">
          <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] px-2 py-0.5 rounded-full font-bold">
            🏗️ Document Chantier
          </span>
        </div>
      )
    }

    if (knowledge_type === 'organization') {
      return (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
          <span className="bg-purple-50 text-purple-600 border border-purple-100 text-[10px] px-2 py-0.5 rounded-full font-bold">
            🏢 Document Entreprise
          </span>
        </div>
      )
    }

    if (knowledge_type === 'new') {
      return (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-100">
          <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] px-2 py-0.5 rounded-full font-bold">
            ✨ Nouvelle réponse
          </span>
          <span className="text-[10px] text-stone-400">
            Votez 👍 pour la valider
          </span>
        </div>
      )
    }

    return null
  }

  // Render des sources avec distinction document/qa_memory
  const renderSources = () => {
    if (!message.sources || message.sources.length === 0) return null

    return (
      <div className="mt-3 pt-2 border-t border-stone-100">
        <p className="text-[10px] text-stone-400 font-medium mb-1">Sources :</p>
        <div className="flex flex-wrap gap-1">
          {message.sources.map((source, index) => (
            <SourceBadge key={index} source={source} index={index} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-4 group">
      {/* Avatar Arpet */}
      <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-white font-serif italic text-sm flex-shrink-0 mt-1">
        A
      </div>

      <div className="flex-1 max-w-2xl">
        {/* Bulle de réponse */}
        <div className="text-sm text-stone-700 leading-relaxed bg-white border border-stone-100 p-4 rounded-r-xl rounded-bl-xl shadow-sm">
          
          {/* Header Knowledge Type */}
          {renderKnowledgeHeader()}

          {/* Contenu du message */}
          <div 
            className="prose prose-sm prose-stone max-w-none"
            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
          />

          {/* Sources */}
          {renderSources()}

          {/* Erreur de vote */}
          {voteError && (
            <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="w-3 h-3" />
              {voteError}
            </div>
          )}
        </div>

        {/* Barre d'outils */}
        <div className="flex items-center justify-between mt-2 opacity-100 transition-opacity">
          {/* Actions */}
          <div className="flex gap-2">
            <button 
              onClick={handleAnchorClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                isAnchored 
                  ? 'bg-green-100 text-green-600 hover:bg-green-200 cursor-pointer' 
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
              }`}
              title={isAnchored ? 'Ouvrir dans le Bac à Sable' : 'Ancrer dans le Bac à Sable'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isAnchored ? 'fill-current' : ''}`} />
              {isAnchored ? 'Ancré' : 'Ancrer'}
              {isAnchored && <ExternalLink className="w-3 h-3 ml-0.5" />}
            </button>
            <button 
              onClick={handleCopy}
              className="p-1.5 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-600 transition"
              title="Copier"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Vote */}
          <div className="flex items-center gap-1">
            <button 
              onClick={handleVoteUp}
              disabled={isVoting || voteStatus !== 'none'}
              className={`p-1.5 rounded-full transition ${
                voteStatus === 'up'
                  ? 'bg-green-100 text-green-600'
                  : voteStatus !== 'none'
                  ? 'text-stone-200 cursor-not-allowed'
                  : 'hover:bg-green-50 hover:text-green-600 text-stone-300'
              }`}
              title={voteStatus === 'up' ? 'Vous avez validé' : 'Réponse utile'}
            >
              <ThumbsUp className={`w-4 h-4 ${voteStatus === 'up' ? 'fill-current' : ''}`} />
            </button>
            <span className={`text-xs font-bold min-w-[20px] text-center ${
              localValidationCount > 0 ? 'text-green-600' : 'text-stone-400'
            }`}>
              {localValidationCount}
            </span>
            <button 
              onClick={handleVoteDown}
              disabled={isVoting || voteStatus !== 'none'}
              className={`p-1.5 rounded-full transition ${
                voteStatus === 'down'
                  ? 'bg-red-100 text-red-500'
                  : voteStatus !== 'none'
                  ? 'text-stone-200 cursor-not-allowed'
                  : 'hover:bg-red-50 hover:text-red-500 text-stone-300'
              }`}
              title={voteStatus === 'down' ? 'Vous avez signalé' : 'Réponse incorrecte'}
            >
              <ThumbsDown className={`w-4 h-4 ${voteStatus === 'down' ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export du callback pour usage externe (dans ChatArea)
export type { MessageBubbleProps }

// ============================================================
// COMPOSANT SOURCE BADGE
// ============================================================

interface SourceBadgeProps {
  source: MessageSource
  index: number
}

function SourceBadge({ source, index }: SourceBadgeProps) {
  const isQAMemory = source.type === 'qa_memory'
  const authorityBadge = isQAMemory ? getAuthorityBadge(source.authority_label) : null

  if (isQAMemory) {
    return (
      <span 
        className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 ${
          authorityBadge?.color || 'bg-green-50 text-green-600'
        }`}
        title={source.content_preview}
      >
        {source.authority_label === 'expert' && '⭐'}
        {source.authority_label === 'team' && '✓'}
        {source.name || 'Réponse validée'}
        {source.score && ` (${Math.round(source.score * 100)}%)`}
      </span>
    )
  }

  return (
    <span 
      className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded"
      title={source.content_preview}
    >
      {source.document_name || source.name || `Document ${index + 1}`}
      {source.score && ` (${Math.round(source.score * 100)}%)`}
    </span>
  )
}

// ============================================================
// HELPER: FORMAT CONTENT
// ============================================================

function formatContent(content: string): string {
  // Convertir le markdown basique en HTML
  let formatted = content

  // Bold: **text** ou __text__
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>')

  // Italic: *text* ou _text_
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>')
  formatted = formatted.replace(/_(.+?)_/g, '<em>$1</em>')

  // Listes à puces
  formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>')
  if (formatted.includes('<li>')) {
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul class="list-disc pl-5 mt-2 space-y-1 text-stone-600">$1</ul>')
  }

  // Convertir les retours à la ligne
  formatted = formatted.replace(/\n\n/g, '</p><p class="mt-2">')
  formatted = formatted.replace(/\n/g, '<br>')

  // Envelopper dans un paragraphe si nécessaire
  if (!formatted.startsWith('<')) {
    formatted = `<p>${formatted}</p>`
  }

  return formatted
}
