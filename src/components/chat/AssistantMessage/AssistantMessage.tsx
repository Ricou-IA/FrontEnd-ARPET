// ============================================================
// AssistantMessage Component
// Affiche un message de l'assistant avec vote et sources
// ============================================================

import { useState, useCallback, useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import type { Message, ViewerDocument } from '../../../types'
import { getSourceFileById, getFileDownloadUrl } from '../../../services/documents.service'
import { useAuth } from '../../../hooks/useAuth'
import { useAppStore } from '../../../stores/appStore'
import * as voteService from '../../../services/vote.service'
import { RagBadge } from '../RagBadge'
import { formatContent } from '../utils/format-content'
import { KnowledgeHeader } from './KnowledgeHeader'
import { SourcesList } from './SourcesList'
import { CrossRefActions } from './CrossRefActions'
import { CopyButton } from './CopyButton'
import { VoteButtons } from './VoteButtons'

type CrossRefActionItem = NonNullable<Message['cross_ref_actions']>[number]

interface AssistantMessageProps {
  message: Message
  userQuestion?: string
  projectId?: string | null
  activeProject?: { id: string; org_id: string } | null
  onVoteComplete?: (message: Message, voteType: 'up' | 'down', qaId?: string) => void
  onCrossRefAction?: (action: CrossRefActionItem, originalMessage: Message) => void
}

export function AssistantMessage({
  message,
  userQuestion,
  projectId,
  activeProject,
  onVoteComplete,
  onCrossRefAction,
}: AssistantMessageProps) {
  const { profile } = useAuth()
  const { openViewer } = useAppStore()

  // États locaux
  const [isVoting, setIsVoting] = useState(false)
  const [voteStatus, setVoteStatus] = useState<'none' | 'up' | 'down'>(message.user_vote || 'none')
  const [voteError, setVoteError] = useState<string | null>(null)
  const [localTrustScore, setLocalTrustScore] = useState(message.qa_memory_trust_score || 0)

  // Ref pour délégation de clic sur citations inline
  const contentRef = useRef<HTMLDivElement>(null)

  // Déterminer si le bouton down est actif
  const canVoteDown = Boolean(message.qa_memory_id)

  /**
   * Handler délégué pour les citations inline [Document, Page X]
   * Intercepte les clics sur les <a class="source-citation"> générés par formatContent
   */
  const handleContentClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const citation = target.closest('.source-citation') as HTMLAnchorElement | null
    if (!citation) return

    e.preventDefault()
    e.stopPropagation()

    const sourceName = citation.dataset.sourceName
    const sourcePage = citation.dataset.sourcePage ? parseInt(citation.dataset.sourcePage, 10) : undefined

    if (!sourceName) return

    // Chercher la source correspondante dans les sources du message
    const matchedSource = message.sources?.find(s => {
      const name = s.document_name || s.name || ''
      return name.toLowerCase().includes(sourceName.toLowerCase()) ||
             sourceName.toLowerCase().includes(name.toLowerCase().replace(/\.[^.]+$/, ''))
    })

    const sourceFileId = matchedSource?.source_file_id
    if (!sourceFileId) {
      if (import.meta.env.DEV) {
        console.warn('[AssistantMessage] Citation click: no source_file_id found for', sourceName)
      }
      return
    }

    // Ouvrir le document (même logique que SourceBadge)
    try {
      const { data: file, error: fileError } = await getSourceFileById(sourceFileId)
      if (fileError || !file || !file.storage_path) return

      const { data: url, error: urlError } = await getFileDownloadUrl(file.storage_bucket, file.storage_path)
      if (urlError || !url) return

      const viewerDoc: ViewerDocument = {
        id: file.id,
        filename: file.original_filename,
        url,
        mimeType: file.mime_type,
        fileSize: file.file_size,
        initialPage: sourcePage || matchedSource?.page || undefined,
      }

      openViewer(viewerDoc)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[AssistantMessage] Citation click error:', err)
      }
    }
  }, [message.sources, openViewer])

  /**
   * Vote positif
   */
  const handleVoteUp = useCallback(async () => {
    if (isVoting || voteStatus !== 'none') return

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
        console.log('[AssistantMessage] voteUpExisting:', message.qa_memory_id)

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
      // Cas 3: Nouvelle réponse RAG
      else {
        if (!userQuestion) {
          setVoteError('Question non disponible')
          return
        }

        const sourceFileIds = message.sources
          ?.filter(s => s.source_file_id)
          .map(s => s.source_file_id as string) || []

        const effectiveProjectId = projectId || activeProject?.id || null

        console.log('[AssistantMessage] voteUpNew:', {
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
      console.error('[AssistantMessage] Vote error:', err)
    } finally {
      setIsVoting(false)
    }
  }, [isVoting, voteStatus, message, profile, activeProject, projectId, userQuestion, onVoteComplete])

  /**
   * Vote négatif
   */
  const handleVoteDown = useCallback(async () => {
    if (isVoting || voteStatus !== 'none') return

    if (!message.qa_memory_id) {
      setVoteError('Seules les réponses validées peuvent être signalées')
      return
    }

    setIsVoting(true)
    setVoteError(null)

    try {
      console.log('[AssistantMessage] voteDown:', message.qa_memory_id)

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
      console.error('[AssistantMessage] Vote down error:', err)
    } finally {
      setIsVoting(false)
    }
  }, [isVoting, voteStatus, message, onVoteComplete])

  return (
    <div className="flex gap-4 group">
      <div className="w-8 h-8 rounded-full bg-stone-800 dark:bg-stone-200 flex items-center justify-center text-white dark:text-stone-800 font-serif italic text-sm flex-shrink-0 mt-1">
        A
      </div>

      <div className="flex-1 max-w-2xl">
        <div className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 p-4 rounded-r-xl rounded-bl-xl shadow-sm">

          <KnowledgeHeader
            fromMemory={message.from_memory}
            isExpert={message.qa_memory_is_expert}
            knowledgeType={message.knowledge_type}
            trustScore={localTrustScore}
          />

          {/* Badge RAG (mode de génération) */}
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

          {/* Contenu du message — les citations inline [Doc, Page X] sont cliquables */}
          <div
            ref={contentRef}
            onClick={handleContentClick}
            className="prose prose-sm prose-stone dark:prose-invert max-w-none font-serif"
            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
          />

          <SourcesList
            sources={message.sources || []}
            responseContent={message.content}
            onOpenViewer={openViewer}
          />

          {/* Actions de croisement (Comparer, Conformité, Synthétiser) */}
          {message.cross_ref_actions && message.cross_ref_actions.length > 0 && !message.isStreaming && (
            <CrossRefActions
              actions={message.cross_ref_actions}
              onAction={(action) => onCrossRefAction?.(action, message)}
              disabled={!onCrossRefAction}
            />
          )}

          {/* Erreur de vote */}
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

        {/* Barre d'actions */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-2">
            <CopyButton content={message.content} />
          </div>

          <VoteButtons
            voteStatus={voteStatus}
            isVoting={isVoting}
            localTrustScore={localTrustScore}
            canVoteDown={canVoteDown}
            onVoteUp={handleVoteUp}
            onVoteDown={handleVoteDown}
          />
        </div>
      </div>
    </div>
  )
}
