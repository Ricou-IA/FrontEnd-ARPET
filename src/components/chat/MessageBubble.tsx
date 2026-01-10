// ============================================================
// ARPET - MessageBubble Component
// Version: 10.1.0 - Transformation balises cite en italique
// Date: 2026-01-05
// Changes:
//   - Bulles sans fond ni bordure (effet papier quadrillé)
//   - Message utilisateur en gras
//   - Suppression badge "Nouvelle réponse"
//   - Badges sur une seule ligne (type + validations + temps)
//   - RagBadge uniquement si pas from_memory
//   - Trait séparation sources accentué
//   - Tags sources affichés en entier (pas de truncate)
//   - v10.1.0: Transformation <cite> → italique dans formatContent
// ============================================================

import { useState, useCallback } from 'react'
import {
  Copy, ThumbsUp, ThumbsDown, Check,
  AlertCircle, CheckCircle, Loader2, Eye, Brain
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
  /** Question posée par l'utilisateur (pour vote_up_new) */
  userQuestion?: string
  /** Project ID courant (pour vote_up_new) */
  projectId?: string | null
  /** Projet actif avec org_id (fallback pour super admin) */
  activeProject?: { id: string; org_id: string } | null
  /** Callback après vote réussi */
  onVoteComplete?: (message: Message, voteType: 'up' | 'down', qaId?: string) => void
}

export function MessageBubble({ message, userQuestion, projectId, activeProject, onVoteComplete }: MessageBubbleProps) {
  const { profile } = useAuth()
  const { openViewer } = useAppStore()

  // États locaux
  const [isVoting, setIsVoting] = useState(false)
  const [voteStatus, setVoteStatus] = useState<'none' | 'up' | 'down'>(message.user_vote || 'none')
  const [voteError, setVoteError] = useState<string | null>(null)
  const [localTrustScore, setLocalTrustScore] = useState(message.qa_memory_trust_score || 0)
  const [copied, setCopied] = useState(false)

  // ================================================================
  // MESSAGE UTILISATEUR
  // ================================================================
  if (message.role === 'user') {
    return (
      <div className="flex gap-4 justify-end animate-[slideDownFade_0.3s_ease-out]">
        <div className="max-w-4xl w-full flex justify-end">
          <div className="text-[15px] font-sans text-stone-900 dark:text-stone-100 p-5 font-semibold">
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
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

  /**
   * Vote positif (👍)
   */
  const handleVoteUp = useCallback(async () => {
    if (isVoting || voteStatus !== 'none') return

    // v8.0.2: Utiliser org_id du profil OU du projet actif (pour super admin)
    const effectiveOrgId = profile?.org_id || activeProject?.org_id

    if (!effectiveOrgId) {
      setVoteError('Organisation requise pour voter (sélectionnez un projet)')
      return
    }

    setIsVoting(true)
    setVoteError(null)

    try {
      // Cas 1 & 2: qa_memory existe déjà
      if (message.qa_memory_id) {
        console.log('[MessageBubble] voteUpExisting:', message.qa_memory_id)

        const result = await voteService.voteUpExisting(message.qa_memory_id)

        if (result.success) {
          setVoteStatus('up')
          setLocalTrustScore(result.trust_score)
          onVoteComplete?.(message, 'up', result.qa_id || undefined)
        } else {
          setVoteError(result.error === 'ALREADY_VOTED'
            ? 'Vous avez déjà voté pour cette réponse'
            : result.message)
        }
      }
      // Cas 3: Nouvelle réponse RAG → créer qa_memory
      else {
        if (!userQuestion) {
          setVoteError('Question non disponible')
          return
        }

        // Extraire les source_file_ids des sources
        const sourceFileIds = message.sources
          ?.filter(s => s.source_file_id)
          .map(s => s.source_file_id as string) || []

        // Utiliser projectId passé en props OU activeProject.id
        const effectiveProjectId = projectId || activeProject?.id || null

        console.log('[MessageBubble] voteUpNew:', {
          question: userQuestion.substring(0, 50) + '...',
          org_id: effectiveOrgId,
          project_id: effectiveProjectId,
          source_file_ids: sourceFileIds
        })

        const result = await voteService.voteUpNew({
          question: userQuestion,
          answer: message.content,
          org_id: effectiveOrgId,
          project_id: effectiveProjectId,
          source_file_ids: sourceFileIds,
        })

        if (result.success) {
          setVoteStatus('up')
          setLocalTrustScore(result.trust_score)
          onVoteComplete?.(message, 'up', result.qa_id || undefined)
        } else {
          setVoteError(result.message)
        }
      }
    } catch (err) {
      setVoteError('Erreur lors du vote')
      console.error('[MessageBubble] Vote error:', err)
    } finally {
      setIsVoting(false)
    }
  }, [isVoting, voteStatus, message, profile, activeProject, projectId, userQuestion, onVoteComplete])

  /**
   * Vote négatif (👎)
   */
  const handleVoteDown = useCallback(async () => {
    if (isVoting || voteStatus !== 'none') return

    // Seules les réponses avec qa_memory_id peuvent être signalées
    if (!message.qa_memory_id) {
      setVoteError('Seules les réponses validées peuvent être signalées')
      return
    }

    setIsVoting(true)
    setVoteError(null)

    try {
      console.log('[MessageBubble] voteDown:', message.qa_memory_id)

      const result = await voteService.voteDown(message.qa_memory_id)

      if (result.success) {
        setVoteStatus('down')
        setLocalTrustScore(result.trust_score)
        onVoteComplete?.(message, 'down')
      } else {
        setVoteError(result.message)
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

  /**
   * Formater le temps de traitement
   */
  const formatProcessingTime = (ms?: number): string | null => {
    if (!ms || ms <= 0) return null
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
  }

  /**
   * Header selon le type de réponse (badges sur une seule ligne)
   * - FAQ Expert
   * - Mémoire Collective
   * - Validée par l'équipe
   * - Rien pour les nouvelles réponses RAG (plus de "Nouvelle réponse")
   */
  const renderKnowledgeHeader = () => {
    const processingTime = formatProcessingTime(message.processing_time_ms)

    // Cas 1: FAQ Expert
    if (message.from_memory && message.qa_memory_is_expert) {
      return (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
            ⭐ FAQ Expert
          </span>
          <span className="text-[11px] text-stone-400 font-medium">
            Réponse instantanée
          </span>
          {processingTime && (
            <span className="text-[11px] text-stone-400">
              {processingTime}
            </span>
          )}
        </div>
      )
    }

    // Cas 2: Mémoire Collective
    if (message.from_memory) {
      return (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20 text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
            <Brain className="w-3 h-3" />
            Mémoire Collective
          </span>
          {localTrustScore > 0 && (
            <span className="text-[11px] text-stone-400 font-medium">
              {localTrustScore} validation{localTrustScore > 1 ? 's' : ''}
            </span>
          )}
          {processingTime && (
            <span className="text-[11px] text-stone-400">
              {processingTime}
            </span>
          )}
        </div>
      )
    }

    // Cas 3: Validée par l'équipe (team_validated)
    if (message.knowledge_type === 'team_validated' || localTrustScore >= 3) {
      return (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20 text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
            <Check className="w-3 h-3" />
            Validée par l'équipe
          </span>
          {localTrustScore > 0 && (
            <span className="text-[11px] text-stone-400 font-medium">
              {localTrustScore} validation{localTrustScore > 1 ? 's' : ''}
            </span>
          )}
          {processingTime && (
            <span className="text-[11px] text-stone-400">
              {processingTime}
            </span>
          )}
        </div>
      )
    }

    // Cas 4: Nouvelle réponse RAG → pas de header badge
    // On laisse RagBadge gérer l'affichage du mode + temps
    return null
  }

  /**
   * Afficher RagBadge uniquement si pas from_memory
   */
  const renderRagBadge = () => {
    // Ne pas afficher RagBadge si c'est une réponse mémoire (déjà dans le header)
    if (message.from_memory) return null

    // Ne pas afficher si pas d'info de génération
    if (!message.generation_mode && !message.generation_mode_ui) return null

    return (
      <RagBadge
        generationMode={message.generation_mode}
        generationModeUi={message.generation_mode_ui}
        cacheStatus={message.cache_status}
        processingTimeMs={message.processing_time_ms}
        documentsFound={message.documents_found}
        className="mb-4"
      />
    )
  }

  /**
   * Affichage des sources
   */
  const renderSources = () => {
    if (!message.sources || message.sources.length === 0) return null

    return (
      <div className="mt-5 pt-4 border-t-2 border-stone-300 dark:border-stone-600">
        <p className="text-[11px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider mb-2">Sources</p>
        <div className="flex flex-wrap gap-2">
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

  const canVoteDown = Boolean(message.qa_memory_id)

  return (
    <div className="flex gap-5 group animate-[slideDownFade_0.4s_ease-out]">
      <div className="w-9 h-9 rounded-xl bg-stone-900 dark:bg-white flex items-center justify-center text-white dark:text-stone-900 font-serif italic text-sm flex-shrink-0 mt-1 shadow-md shadow-stone-900/10">
        A
      </div>

      <div className="flex-1 max-w-4xl">
        {/* Bulle principale - Transparente pour effet papier quadrillé */}
        <div className="relative text-[15px] text-stone-700 dark:text-stone-200 leading-relaxed p-6">

          {renderKnowledgeHeader()}

          {/* Badge RAG (mode de génération) - uniquement si pas from_memory */}
          {renderRagBadge()}

          {/* Contenu du message */}
          <div
            className="prose prose-sm prose-stone dark:prose-invert max-w-none font-sans"
            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
          />

          {renderSources()}

          {/* Erreur de vote */}
          {voteError && (
            <div className="mt-4 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{voteError}</span>
              <button
                onClick={() => setVoteError(null)}
                className="ml-auto hover:bg-red-100 p-1 rounded transition-colors"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Barre d'actions */}
        <div className="flex items-center justify-between mt-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Bouton Copier */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${copied
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>

          {/* Boutons de vote - Style pillule */}
          <div className="flex items-center gap-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-full p-1 shadow-sm">
            {/* Vote Up */}
            <button
              onClick={handleVoteUp}
              disabled={isVoting || voteStatus !== 'none'}
              className={`p-2 rounded-full transition-all ${voteStatus === 'up'
                  ? 'bg-green-100 text-green-600'
                  : voteStatus !== 'none'
                    ? 'text-stone-300 cursor-not-allowed'
                    : 'hover:bg-stone-100 text-stone-400 hover:text-green-600'
                }`}
            >
              {isVoting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ThumbsUp className={`w-4 h-4 ${voteStatus === 'up' ? 'fill-current' : ''}`} />
              )}
            </button>

            <div className="w-px h-4 bg-stone-200 dark:bg-stone-700" />

            {/* Vote Down */}
            <button
              onClick={handleVoteDown}
              disabled={isVoting || voteStatus !== 'none' || !canVoteDown}
              className={`p-2 rounded-full transition-all ${voteStatus === 'down'
                  ? 'bg-red-100 text-red-500'
                  : !canVoteDown
                    ? 'text-stone-200 cursor-not-allowed'
                    : voteStatus !== 'none'
                      ? 'text-stone-300 cursor-not-allowed'
                      : 'hover:bg-stone-100 text-stone-400 hover:text-red-500'
                }`}
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
// COMPOSANT SOURCE BADGE
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

  // Badge pour qa_memory - texte complet sans truncate
  if (isQAMemory) {
    return (
      <span
        className={`text-[11px] px-2.5 py-1 rounded-md flex items-center gap-1.5 cursor-help border transition-colors ${authorityBadge?.color
            ? 'bg-opacity-10 border-opacity-20'
            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
          }`}
        title={source.content_preview || 'Réponse validée'}
      >
        {source.authority_label === 'expert' && '⭐'}
        {source.authority_label === 'team' && '✓'}
        <span className="font-medium">
          {source.document_name || source.name || 'Mémoire collective'}
        </span>
      </span>
    )
  }

  // Badge pour document - texte complet sans truncate
  const displayName = source.document_name || source.name || 'Document'

  return (
    <span
      className="text-[11px] bg-stone-50 border border-stone-200 text-stone-500 px-2.5 py-1 rounded-md flex items-center gap-2 group/source transition-colors hover:bg-stone-100 hover:border-stone-300"
      title={source.content_preview || 'Document source'}
    >
      <span className="font-medium">
        {displayName}
      </span>
      {source.score !== undefined && (
        <span className="opacity-50 text-[10px]">({Math.round(source.score * 100)}%)</span>
      )}

      {isDocument && (
        <button
          onClick={handleViewDocument}
          disabled={isLoading}
          className="ml-1 p-0.5 rounded-full hover:bg-blue-100 text-stone-400 hover:text-blue-600 transition-all disabled:opacity-50"
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

/**
 * Formate le contenu du message avec support Markdown et citations
 * - Transforme **bold** et __bold__ en <strong>
 * - Transforme *italic* en <em>
 * - Transforme `code` en <code>
 * - Transforme les listes - et 1.
 * - Transforme <cite doc="..." page="...">texte</cite> en italique
 * - Gère les sauts de ligne
 */
function formatContent(content: string): string {
  let formatted = content

  // Transformer les balises <cite> en italique (AVANT les autres transformations)
  // Format: <cite doc="CCAG" page="23">section 19.3</cite> → *section 19.3*
  formatted = formatted.replace(/<cite[^>]*>([^<]*)<\/cite>/g, '<em class="italic text-stone-600 dark:text-stone-400">$1</em>')

  // Markdown classique
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-stone-900 dark:text-stone-100">$1</strong>')
  formatted = formatted.replace(/__(.+?)__/g, '<strong class="font-semibold text-stone-900 dark:text-stone-100">$1</strong>')
  formatted = formatted.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em class="italic text-stone-800 dark:text-stone-300">$1</em>')
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-1.5 py-0.5 rounded text-[13px] font-mono text-stone-800 dark:text-stone-200">$1</code>')
  formatted = formatted.replace(/^- (.+)$/gm, '<span class="inline-block ml-2 text-stone-400 mr-2">•</span>$1')
  formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<span class="font-bold text-stone-800 dark:text-stone-200 mr-1">$1.</span> $2')
  formatted = formatted.replace(/\n\n/g, '</p><p class="mt-4">')
  formatted = formatted.replace(/\n/g, '<br>')

  if (!formatted.startsWith('<')) {
    formatted = `<p>${formatted}</p>`
  }

  return formatted
}

export type { MessageBubbleProps }
