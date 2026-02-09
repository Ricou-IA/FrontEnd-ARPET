// ============================================================
// ARPET - Dashboard Page
// Version: 6.3.0 - Ajout Wizard Cross-Ref (P3)
// Date: 2026-02-04
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { MessageBubble } from '../components/chat/MessageBubble'
import { ChatInput } from '../components/chat/ChatInput'
import { SaveConversationModal } from '../components/chat/SaveConversationModal'
import { StreamingBubble } from '../components/chat/StreamingBubble'
import { sendMessageStream, type ChatResponse, type SSEStepEvent, type CrossRefAction } from '../services/chat.service'
import type { Message, MessageSource } from '../types'
import type { WizardSubmitResult } from '../components/chat/CrossRefWizard'

// ============================================================
// PAGE PRINCIPALE
// ============================================================

export function Dashboard() {
  const { profile } = useAuth()
  const {
    messages,
    addMessage,
    clearMessages,
    activeProject,
    isAgentTyping,
    setIsAgentTyping,
    saveConversation,
    currentConversationId,
    setCurrentConversationId,
  } = useAppStore()

  const userName = profile?.full_name?.split(' ')[0] || 'Eric'
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // État pour la modale de sauvegarde
  const [showSaveModal, setShowSaveModal] = useState(false)

  // États pour le streaming
  const [streamingContent, setStreamingContent] = useState('')
  const [currentSteps, setCurrentSteps] = useState<SSEStepEvent[]>([])
  const [stepsComplete, setStepsComplete] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll vers le bas
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      })
    }
  }, [messages, isAgentTyping, streamingContent, currentSteps])

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Générer un titre par défaut
  const generateDefaultTitle = (): string => {
    const firstUserMessage = messages.find(m => m.role === 'user')
    if (firstUserMessage) {
      const words = firstUserMessage.content.split(' ').slice(0, 6).join(' ')
      return words.length > 50 ? words.substring(0, 50) + '...' : words
    }
    return `Conversation du ${new Date().toLocaleDateString('fr-FR')}`
  }

  // Sauvegarder la conversation
  const handleSaveConversation = async (title: string) => {
    console.log('💾 [Dashboard] Début sauvegarde, messages:', messages.length)

    const result = await saveConversation({
      title,
      messages,
      project_id: activeProject?.id || null,
    })

    if (!result) {
      console.error('💾 [Dashboard] Échec sauvegarde')
      throw new Error('Erreur lors de la sauvegarde')
    }

    console.log('💾 [Dashboard] Sauvegarde OK, clearMessages...')
    await clearMessages()
  }

  // Envoyer un message avec streaming
  const handleSendMessage = async (content: string, _files?: File[], deepAnalysis?: boolean) => {
    if (!content.trim()) return

    if (deepAnalysis && _files && _files.length > 0) {
      console.log('[Dashboard] Mode Deep Analysis activé pour les fichiers:', _files.map(f => f.name))
    }

    // Message utilisateur
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    addMessage(userMessage)

    // Reset états streaming
    const assistantMessageId = crypto.randomUUID()
    setStreamingContent('')
    setCurrentSteps([])
    setStepsComplete(false)
    setIsAgentTyping(true)

    const userId = profile?.id || null

    // v6.2.0: Utiliser activeProject.org_id en priorité (super admin)
    const effectiveOrgId = activeProject?.org_id || profile?.org_id || null

    console.log('[Dashboard] User ID:', userId)
    console.log('[Dashboard] Org ID:', effectiveOrgId)
    console.log('[Dashboard] Project ID:', activeProject?.id)
    console.log('[Dashboard] Conversation ID:', currentConversationId || 'nouvelle conversation')
    console.log('[Dashboard] Démarrage streaming SSE...')

    let fullResponse = ''
    let receivedSources: MessageSource[] = []
    let receivedMetadata: Partial<ChatResponse> = {}
    let receivedCrossRefActions: CrossRefAction[] = []

    try {
      abortControllerRef.current = await sendMessageStream(
        {
          query: content,
          user_id: userId,
          org_id: effectiveOrgId,
          project_id: activeProject?.id || null,
          conversation_id: currentConversationId,
        },
        {
          // Callback pour les étapes
          onStep: (step: SSEStepEvent) => {
            console.log('[Dashboard] Step reçu:', step.step, step.message)
            setCurrentSteps(prev => [...prev, step])

            // Marquer les étapes comme "en génération" quand on commence à générer
            if (step.step === 'generating') {
              setStepsComplete(true)
            }
          },

          // Callback pour chaque token
          onToken: (token: string) => {
            fullResponse += token
            setStreamingContent(prev => prev + token)
          },

          // Callback pour les sources
          onSources: (sources: MessageSource[], metadata: Partial<ChatResponse>) => {
            console.log('[Dashboard] Sources reçues:', sources.length)
            console.log('[Dashboard] Metadata:', metadata)
            receivedSources = sources
            receivedMetadata = metadata

            if (metadata.conversation_id) {
              console.log('[Dashboard] Conversation ID reçu:', metadata.conversation_id)
              setCurrentConversationId(metadata.conversation_id)
            }
          },

          // Callback pour les actions cross-ref
          onCrossRefActions: (actions) => {
            if (import.meta.env.DEV) {
              console.log('[Dashboard] Cross-ref actions reçues:', actions.length)
            }
            receivedCrossRefActions = actions
          },

          // Callback erreur
          onError: (error: Error) => {
            console.error('[Dashboard] Erreur streaming:', error)

            const errorMessage: Message = {
              id: assistantMessageId,
              role: 'assistant',
              content: 'Désolé, une erreur est survenue lors du traitement de votre demande. Veuillez réessayer.',
              timestamp: new Date(),
            }
            addMessage(errorMessage)

            setStreamingContent('')
            setCurrentSteps([])
            setStepsComplete(false)
            setIsAgentTyping(false)
          },

          // Callback fin du stream
          onComplete: () => {
            console.log('[Dashboard] Stream terminé, longueur réponse:', fullResponse.length)

            const assistantMessage: Message = {
              id: assistantMessageId,
              role: 'assistant',
              content: fullResponse || 'Aucune réponse reçue.',
              timestamp: new Date(),

              knowledge_type: receivedMetadata.knowledge_type,
              validation_count: receivedMetadata.validation_count || 0,
              agent_source: receivedMetadata.agent_source,
              sources: receivedSources.length > 0 ? receivedSources : undefined,

              documents_found: receivedMetadata.documents_found,
              qa_memory_found: receivedMetadata.qa_memory_found,
              processing_time_ms: receivedMetadata.processing_time_ms,
              prompt_used: receivedMetadata.prompt_used,
              prompt_resolution: receivedMetadata.prompt_resolution,

              generation_mode: receivedMetadata.generation_mode,
              generation_mode_ui: receivedMetadata.generation_mode_ui,
              cache_status: receivedMetadata.cache_status,

              can_vote: true,
              vote_context: {
                question: content,
                answer: fullResponse,
                source_ids: receivedSources
                  .map(s => s.id)
                  .filter((id): id is string => typeof id === 'string'),
              },

              user_vote: null,

              cross_ref_actions: receivedCrossRefActions.length > 0 ? receivedCrossRefActions : undefined,
            }

            addMessage(assistantMessage)

            // Reset états streaming
            setStreamingContent('')
            setCurrentSteps([])
            setStepsComplete(false)
            setIsAgentTyping(false)
            abortControllerRef.current = null
          },
        }
      )

    } catch (err) {
      console.error('[Dashboard] Erreur envoi message:', err)
      const errorMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: 'Une erreur inattendue est survenue. Veuillez réessayer.',
        timestamp: new Date(),
      }
      addMessage(errorMessage)

      setStreamingContent('')
      setCurrentSteps([])
      setStepsComplete(false)
      setIsAgentTyping(false)
    }
  }

  const handleVoteComplete = (message: Message, voteType: 'up' | 'down', qaId?: string) => {
    console.log('[Dashboard] Vote complété:', { messageId: message.id, voteType, qaId })
  }

  // Handler cross-ref : envoie une requête spécialisée avec le mode de croisement
  const handleCrossRefAction = (action: CrossRefAction, originalMessage: Message) => {
    if (isAgentTyping) return

    const syntheticQuery = `${action.label} — ${action.documents.join(' / ')}`

    if (import.meta.env.DEV) {
      console.log('[Dashboard] Cross-ref action:', action.type, action.documents)
    }

    // Insérer un message utilisateur synthétique
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: syntheticQuery,
      timestamp: new Date(),
    }
    addMessage(userMessage)

    // Reset états streaming
    const assistantMessageId = crypto.randomUUID()
    setStreamingContent('')
    setCurrentSteps([])
    setStepsComplete(false)
    setIsAgentTyping(true)

    const userId = profile?.id || null
    const effectiveOrgId = activeProject?.org_id || profile?.org_id || null

    let fullResponse = ''
    let receivedSources: MessageSource[] = []
    let receivedMetadata: Partial<ChatResponse> = {}

    sendMessageStream(
      {
        query: syntheticQuery,
        user_id: userId,
        org_id: effectiveOrgId,
        project_id: activeProject?.id || null,
        conversation_id: currentConversationId,
        cross_ref_mode: action.type,
        detected_documents: action.documents,
        cross_ref_context: originalMessage.content,
      },
      {
        onStep: (step) => {
          setCurrentSteps(prev => [...prev, step])
          if (step.step === 'generating') {
            setStepsComplete(true)
          }
        },
        onToken: (token) => {
          fullResponse += token
          setStreamingContent(prev => prev + token)
        },
        onSources: (sources, metadata) => {
          receivedSources = sources
          receivedMetadata = metadata
          if (metadata.conversation_id) {
            setCurrentConversationId(metadata.conversation_id)
          }
        },
        onError: (error) => {
          console.error('[Dashboard] Erreur cross-ref streaming:', error)
          addMessage({
            id: assistantMessageId,
            role: 'assistant',
            content: 'Erreur lors de l\'analyse croisée. Veuillez réessayer.',
            timestamp: new Date(),
          })
          setStreamingContent('')
          setCurrentSteps([])
          setStepsComplete(false)
          setIsAgentTyping(false)
        },
        onComplete: () => {
          addMessage({
            id: assistantMessageId,
            role: 'assistant',
            content: fullResponse || 'Aucune réponse reçue.',
            timestamp: new Date(),
            knowledge_type: receivedMetadata.knowledge_type,
            validation_count: receivedMetadata.validation_count || 0,
            agent_source: receivedMetadata.agent_source,
            sources: receivedSources.length > 0 ? receivedSources : undefined,
            documents_found: receivedMetadata.documents_found,
            processing_time_ms: receivedMetadata.processing_time_ms,
            generation_mode: receivedMetadata.generation_mode,
            generation_mode_ui: receivedMetadata.generation_mode_ui,
            cache_status: receivedMetadata.cache_status,
            can_vote: true,
            vote_context: {
              question: syntheticQuery,
              answer: fullResponse,
              source_ids: receivedSources
                .map(s => s.id)
                .filter((id): id is string => typeof id === 'string'),
            },
            user_vote: null,
          })
          setStreamingContent('')
          setCurrentSteps([])
          setStepsComplete(false)
          setIsAgentTyping(false)
          abortControllerRef.current = null
        },
      }
    ).then(controller => {
      abortControllerRef.current = controller
    })
  }

  // Handler wizard cross-ref : envoie une requête structurée depuis le wizard
  const handleWizardSubmit = (result: WizardSubmitResult) => {
    if (isAgentTyping) return

    if (import.meta.env.DEV) {
      console.log('[Dashboard] Wizard cross-ref:', result.cross_ref_mode, result.detected_documents)
    }

    // Insérer un message utilisateur avec la question générée
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: result.query,
      timestamp: new Date(),
    }
    addMessage(userMessage)

    // Reset états streaming
    const assistantMessageId = crypto.randomUUID()
    setStreamingContent('')
    setCurrentSteps([])
    setStepsComplete(false)
    setIsAgentTyping(true)

    const userId = profile?.id || null
    const effectiveOrgId = activeProject?.org_id || profile?.org_id || null

    let fullResponse = ''
    let receivedSources: MessageSource[] = []
    let receivedMetadata: Partial<ChatResponse> = {}
    let receivedCrossRefActions: CrossRefAction[] = []

    sendMessageStream(
      {
        query: result.query,
        user_id: userId,
        org_id: effectiveOrgId,
        project_id: activeProject?.id || null,
        conversation_id: currentConversationId,
        cross_ref_mode: result.cross_ref_mode,
        detected_documents: result.detected_documents,
      },
      {
        onStep: (step) => {
          setCurrentSteps(prev => [...prev, step])
          if (step.step === 'generating') {
            setStepsComplete(true)
          }
        },
        onToken: (token) => {
          fullResponse += token
          setStreamingContent(prev => prev + token)
        },
        onSources: (sources, metadata) => {
          receivedSources = sources
          receivedMetadata = metadata
          if (metadata.conversation_id) {
            setCurrentConversationId(metadata.conversation_id)
          }
        },
        onCrossRefActions: (actions) => {
          if (import.meta.env.DEV) {
            console.log('[Dashboard] Wizard cross-ref actions reçues:', actions.length)
          }
          receivedCrossRefActions = actions
        },
        onError: (error) => {
          console.error('[Dashboard] Erreur wizard cross-ref streaming:', error)
          addMessage({
            id: assistantMessageId,
            role: 'assistant',
            content: 'Erreur lors de l\'analyse croisée. Veuillez réessayer.',
            timestamp: new Date(),
          })
          setStreamingContent('')
          setCurrentSteps([])
          setStepsComplete(false)
          setIsAgentTyping(false)
        },
        onComplete: () => {
          addMessage({
            id: assistantMessageId,
            role: 'assistant',
            content: fullResponse || 'Aucune réponse reçue.',
            timestamp: new Date(),
            knowledge_type: receivedMetadata.knowledge_type,
            validation_count: receivedMetadata.validation_count || 0,
            agent_source: receivedMetadata.agent_source,
            sources: receivedSources.length > 0 ? receivedSources : undefined,
            documents_found: receivedMetadata.documents_found,
            processing_time_ms: receivedMetadata.processing_time_ms,
            generation_mode: receivedMetadata.generation_mode,
            generation_mode_ui: receivedMetadata.generation_mode_ui,
            cache_status: receivedMetadata.cache_status,
            can_vote: true,
            vote_context: {
              question: result.query,
              answer: fullResponse,
              source_ids: receivedSources
                .map(s => s.id)
                .filter((id): id is string => typeof id === 'string'),
            },
            user_vote: null,
            cross_ref_actions: receivedCrossRefActions.length > 0 ? receivedCrossRefActions : undefined,
          })
          setStreamingContent('')
          setCurrentSteps([])
          setStepsComplete(false)
          setIsAgentTyping(false)
          abortControllerRef.current = null
        },
      }
    ).then(controller => {
      abortControllerRef.current = controller
    })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 px-8 py-4 flex-shrink-0 bg-transparent border-b-0">
        <h1 className="font-serif text-4xl font-normal text-[#0B0F17] dark:text-stone-100 max-w-3xl">
          Bonjour {userName},
        </h1>
      </header>

      {/* Zone Messages - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-6 w-full">
        <div className="max-w-6xl mx-auto space-y-6 pt-4">
          {/* v6.1.0: Passage des props pour le vote */}
          {messages.map((message, index) => {
            // Trouver la question utilisateur précédente (pour vote_up_new)
            const previousUserMessage = messages
              .slice(0, index)
              .reverse()
              .find(m => m.role === 'user')

            return (
              <MessageBubble
                key={message.id}
                message={message}
                userQuestion={previousUserMessage?.content}
                projectId={activeProject?.id}
                activeProject={activeProject}
                onVoteComplete={handleVoteComplete}
                onCrossRefAction={handleCrossRefAction}
              />
            )
          })}

          {/* Affichage du streaming avec étapes */}
          {isAgentTyping && (
            <StreamingBubble
              content={streamingContent}
              steps={currentSteps}
              stepsComplete={stepsComplete}
            />
          )}

          <div ref={messagesEndRef} className="h-8" />
        </div>
      </div>

      {/* Zone de Saisie */}
      <div className="flex-shrink-0 px-4 sm:px-8 pb-6 w-full">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 dark:border-white/5 p-4 ring-1 ring-black/5 dark:ring-white/5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] transition-shadow duration-300">
            <ChatInput
              onSendMessage={handleSendMessage}
              onWizardSubmit={handleWizardSubmit}
              onSaveConversation={messages.length > 0 ? () => setShowSaveModal(true) : undefined}
              disabled={isAgentTyping}
              projectId={activeProject?.id || null}
              orgId={activeProject?.org_id || profile?.org_id || null}
              projectName={activeProject?.name || null}
            />
          </div>
        </div>
      </div>

      {/* Modale de sauvegarde */}
      <SaveConversationModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveConversation}
        defaultTitle={generateDefaultTitle()}
      />
    </div>
  )
}
