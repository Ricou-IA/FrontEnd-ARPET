// ============================================================
// ARPET - MessageBubble Component
// Version: 7.0.0 - Phase 5 : Sources filtrées côté backend
// Date: 2024-12-30
// ============================================================

import { useState, useCallback } from 'react'
import { 
  Copy, ThumbsUp, ThumbsDown, Zap, Check, 
  AlertCircle, CheckCircle, Loader2, Eye 
} from 'lucide-react'
import type { Message, MessageSource, ViewerDocument } from '../../types'
import { getAuthorityBadge } from '../../types'
import { RagBadge } from './RagBadge'
import * as voteService from '../../services/vote.service'
import { getSourceFileById, getFileDownloadUrl } from '../../services/documents.service'
import { useAuth } from '../../hooks/useAuth'
import { useAppStore } from '../../stores/appStore'

interface MessageBubbleProps {
  message: Message
  onVoteComplete?: (message: Message, voteType: 'up' | 'down', qaId?: string) => void
}

export function MessageBubble({ message, onVoteComplete }: MessageBubbleProps) {
  const { profile } = useAuth()
  const { openViewer } = useAppStore()
  
  // États locaux
  const [isVoting, setIsVoting] = useState(false)
  const [voteStatus, setVoteStatus] = useState<'none' | 'up' | 'down'>(message.user_vote || 'none')
  const [voteError, setVoteError] = useState<string | null>(null)
  const [localValidationCount, setLocalValidationCount] = useState(message.validation_count || 0)
  const [copied, setCopied] = useState(false)

  // ================================================================
  // MESSAGE UTILISATEUR
  // ================================================================
  if (message.role === 'user') {
    return (
      <div className="flex gap-4 justify-end">
        <div className="max-w-2xl">
          <div className="text-sm font-sans text-stone-700 dark:text-stone-200 leading-relaxed bg-stone-100 dark:bg-stone-800 p-4 rounded-l-xl rounded-br-xl">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      </div>
    )
  }

  // ================================================================
  // HANDLERS
  // ================================================================
  
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Erreur copie:', err)
    }
  }, [message.content])

  const handleVoteUp = useCallback(async () => {
    if (isVoting || voteStatus !== 'none') return
    
    if (!message.can_vote && !message.vote_context) {
      setVoteError('Vote non disponible pour ce message')
      return
    }

    setIsVoting(true)
    setVoteError(null)

    try {
      const existingQaId = message.sources?.find(s => s.qa_id)?.qa_id

      if (existingQaId) {
        const result = await voteService.voteUp(existingQaId)
        
        if (result.success) {
          setVoteStatus('up')
          setLocalValidationCount(prev => prev + 1)
          onVoteComplete?.(message, 'up', existingQaId)
        } else {
          setVoteError(result.message)
        }
      } else if (message.vote_context && profile?.org_id) {
        const result = await voteService.voteUpNewAnswer(
          message.vote_context,
          profile.org_id
        )

        if (result.success) {
          setVoteStatus('up')
          setLocalValidationCount(prev => prev + 1)
          const qaId = 'qa_id' in result ? result.qa_id : undefined
          onVoteComplete?.(message, 'up', qaId)
        } else {
          setVoteError(result.message)
        }
      } else {
        setVoteError('Connexion requise pour voter')
      }
    } catch (err) {
      setVoteError('Erreur lors du vote')
      console.error('[MessageBubble] Vote error:', err)
    } finally {
      setIsVoting(false)
    }
  }, [isVoting, voteStatus, message, profile, onVoteComplete])

  const handleVoteDown = useCallback(async () => {
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
        setVoteError('Seules les réponses validées peuvent être signalées')
      }
    } catch (err) {
      setVoteError('Erreur lors du signalement')
      console.error('[MessageBubble] Vote down error:', err)
    } finally {
      setIsVoting(false)
    }
  }, [isVoting, voteStatus, message, onVoteComplete])

  // ================================================================
  // RENDER HELPERS
  // ================================================================

  const renderKnowledgeHeader = () => {
    const { knowledge_type } = message

    if (knowledge_type === 'expert_validated') {
      return (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-100 dark:border-amber-900/30">
          <span className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            ⭐ Réponse Expert
          </span>
          {localValidationCount > 0 && (
            <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">
              Validée par {localValidationCount} expert{localValidationCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )
    }

    if (knowledge_type === 'team_validated') {
      return (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-100 dark:border-green-900/30">
          <span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <Check className="w-2.5 h-2.5" />
            Validée par l'équipe
          </span>
          {localValidationCount > 0 && (
            <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">
              {localValidationCount} validation{localValidationCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )
    }

    if (knowledge_type === 'shared') {
      return (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-100 dark:border-stone-800">
          <span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" />
            Savoir Partagé
          </span>
          {localValidationCount > 0 && (
            <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">
              Validé par {localValidationCount} conducteur{localValidationCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )
    }

    if (knowledge_type === 'project') {
      return (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-100 dark:border-blue-900/30">
          <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
            🏗️ Document Chantier
          </span>
        </div>
      )
    }

    if (knowledge_type === 'organization') {
      return (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100 dark:border-purple-900/30">
          <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
            🏢 Document Entreprise
          </span>
        </div>
      )
    }

    if (!knowledge_type || knowledge_type === 'none') {
      return (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-100 dark:border-blue-900/30">
          <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
            ✨ Nouvelle réponse
          </span>
          <span className="text-[10px] text-stone-400 dark:text-stone-500">
            Votez 👍 si cette réponse vous aide
          </span>
        </div>
      )
    }

    return null
  }

  // v7.0.0: Affichage direct des sources (filtrage fait côté backend)
  const renderSources = () => {
    if (!message.sources || message.sources.length === 0) return null

    return (
      <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800">
        <p className="text-[10px] text-stone-400 dark:text-stone-500 font-medium mb-1.5">Sources :</p>
        <div className="flex flex-wrap gap-1.5">
          {message.sources.map((source, index) => (
            <SourceBadge 
              key={source.id || source.source_file_id || index} 
              source={source} 
              onOpenViewer={openViewer}
            />
          ))}
        </div>
      </div>
    )
  }

  // ================================================================
  // RENDER MESSAGE ASSISTANT
  // ================================================================
  return (
    <div className="flex gap-4 group">
      <div className="w-8 h-8 rounded-full bg-stone-800 dark:bg-stone-200 flex items-center justify-center text-white dark:text-stone-800 font-serif italic text-sm flex-shrink-0 mt-1">
        A
      </div>

      <div className="flex-1 max-w-2xl">
        <div className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 p-4 rounded-r-xl rounded-bl-xl shadow-sm">
          
          {renderKnowledgeHeader()}

          {/* v7.0.0: Support generation_mode_ui */}
          {(message.generation_mode || message.generation_mode_ui) && (
            <RagBadge
              generationMode={message.generation_mode}
              generationModeUi={message.generation_mode_ui}
              cacheStatus={message.cache_status}
              processingTimeMs={message.processing_time_ms}
              documentsFound={message.documents_found}
              className="mb-3"
            />
          )}

          <div 
            className="prose prose-sm prose-stone dark:prose-invert max-w-none font-serif"
            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
          />

          {renderSources()}

          {voteError && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1.5 rounded">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{voteError}</span>
              <button 
                onClick={() => setVoteError(null)}
                className="ml-auto text-red-400 hover:text-red-600 dark:hover:text-red-300"
              >
                ×
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-2">
            <button 
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                copied 
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' 
                  : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300'
              }`}
              title={copied ? 'Copié !' : 'Copier'}
            >
              {copied ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={handleVoteUp}
              disabled={isVoting || voteStatus !== 'none'}
              className={`p-1.5 rounded-full transition-all ${
                voteStatus === 'up'
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                  : voteStatus !== 'none'
                  ? 'text-stone-200 dark:text-stone-700 cursor-not-allowed'
                  : 'hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 text-stone-400 dark:text-stone-500'
              }`}
              title={
                voteStatus === 'up' 
                  ? 'Vous avez validé cette réponse' 
                  : 'Cette réponse est utile'
              }
            >
              {isVoting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ThumbsUp className={`w-4 h-4 ${voteStatus === 'up' ? 'fill-current' : ''}`} />
              )}
            </button>
            
            <span className={`text-xs font-bold min-w-[20px] text-center ${
              localValidationCount > 0 ? 'text-green-600 dark:text-green-400' : 'text-stone-400 dark:text-stone-500'
            }`}>
              {localValidationCount}
            </span>
            
            <button 
              onClick={handleVoteDown}
              disabled={isVoting || voteStatus !== 'none'}
              className={`p-1.5 rounded-full transition-all ${
                voteStatus === 'down'
                  ? 'bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400'
                  : voteStatus !== 'none'
                  ? 'text-stone-200 dark:text-stone-700 cursor-not-allowed'
                  : 'hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 text-stone-400 dark:text-stone-500'
              }`}
              title={
                voteStatus === 'down' 
                  ? 'Vous avez signalé cette réponse' 
                  : 'Signaler une réponse incorrecte'
              }
            >
              <ThumbsDown className={`w-4 h-4 ${voteStatus === 'down' ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// COMPOSANT SOURCE BADGE (avec bouton Voir)
// ============================================================

interface SourceBadgeProps {
  source: MessageSource
  onOpenViewer: (doc: ViewerDocument) => void
}

function SourceBadge({ source, onOpenViewer }: SourceBadgeProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const isQAMemory = source.type === 'qa_memory'
  const authorityBadge = isQAMemory ? getAuthorityBadge(source.authority_label) : null
  
  const sourceFileId = source.source_file_id
  const isDocument = !isQAMemory && sourceFileId

  const handleViewDocument = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (isLoading || !sourceFileId) return

    console.log('🔍 Opening document with source_file_id:', sourceFileId)
    setIsLoading(true)
    
    try {
      const { data: file, error: fileError } = await getSourceFileById(sourceFileId)
      
      if (fileError || !file) {
        console.error('Could not find file:', sourceFileId, fileError)
        return
      }

      console.log('📄 Found file:', file.original_filename)

      if (!file.storage_path) {
        console.error('File has no storage path:', file.id)
        return
      }

      const { data: url, error: urlError } = await getFileDownloadUrl(
        file.storage_bucket,
        file.storage_path
      )

      if (urlError || !url) {
        console.error('Could not get signed URL:', urlError)
        return
      }

      const viewerDoc: ViewerDocument = {
        id: file.id,
        filename: file.original_filename,
        url: url,
        mimeType: file.mime_type,
        fileSize: file.file_size,
      }

      onOpenViewer(viewerDoc)
    } catch (err) {
      console.error('Error opening document:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isQAMemory) {
    return (
      <span 
        className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 cursor-help ${
          authorityBadge?.color || 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
        }`}
        title={source.content_preview || 'Réponse validée par la communauté'}
      >
        {source.authority_label === 'expert' && '⭐'}
        {source.authority_label === 'team' && '✓'}
        <span className="truncate max-w-[120px]">
          {source.name || 'Réponse validée'}
        </span>
        {source.score !== undefined && (
          <span className="opacity-60">({Math.round(source.score * 100)}%)</span>
        )}
      </span>
    )
  }

  const displayName = source.document_name || source.name || 'Document'
  
  return (
    <span 
      className="text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-2 py-0.5 rounded flex items-center gap-1.5 group/source"
      title={source.content_preview || 'Document source'}
    >
      <span className="truncate max-w-[150px]">
        {displayName}
      </span>
      {source.score !== undefined && (
        <span className="opacity-60">({Math.round(source.score * 100)}%)</span>
      )}
      
      {isDocument && (
        <button
          onClick={handleViewDocument}
          disabled={isLoading}
          className="p-0.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
          title="Voir le document"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Eye className="w-3 h-3" />
          )}
        </button>
      )}
    </span>
  )
}

// ============================================================
// HELPER: FORMAT CONTENT
// ============================================================

function formatContent(content: string): string {
  let formatted = content

  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>')
  formatted = formatted.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded text-xs">$1</code>')
  formatted = formatted.replace(/^- (.+)$/gm, '• $1')
  formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<span class="font-medium">$1.</span> $2')
  formatted = formatted.replace(/\n\n/g, '</p><p class="mt-3">')
  formatted = formatted.replace(/\n/g, '<br>')

  if (!formatted.startsWith('<')) {
    formatted = `<p>${formatted}</p>`
  }

  return formatted
}

export type { MessageBubbleProps }
