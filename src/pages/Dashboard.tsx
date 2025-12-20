// ============================================================
// ARPET - Dashboard Page
// Version: 5.2.0 - Clear messages après sauvegarde
// Date: 2025-12-19
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { MessageBubble } from '../components/chat/MessageBubble'
import { ChatInput } from '../components/chat/ChatInput'
import { SaveConversationModal } from '../components/chat/SaveConversationModal'
import { supabase } from '../lib/supabase'
import type { Message } from '../types'

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
  } = useAppStore()

  const userName = profile?.full_name?.split(' ')[0] || 'Eric'
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // État pour la modale de sauvegarde
  const [showSaveModal, setShowSaveModal] = useState(false)

  // Auto-scroll vers le bas quand nouveaux messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      })
    }
  }, [messages, isAgentTyping])

  // Générer un titre par défaut depuis le premier message user
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
    clearMessages()
    console.log('💾 [Dashboard] Messages après clear:', useAppStore.getState().messages.length)
  }

  // Envoyer un message
  const handleSendMessage = async (content: string, _files?: File[], deepAnalysis?: boolean) => {
    if (!content.trim()) return
    
    if (deepAnalysis && _files && _files.length > 0) {
      console.log('[Dashboard] Mode Deep Analysis activé pour les fichiers:', _files.map(f => f.name))
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    addMessage(userMessage)

    setIsAgentTyping(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id || null
      
      console.log('[Dashboard] User ID:', userId)
      
      const { data, error } = await supabase.functions.invoke('baikal-brain', {
        body: {
          query: content,
          user_id: userId,
          org_id: profile?.org_id || null,
          project_id: activeProject?.id || null,
        }
      })

      if (error) {
        console.error('[Dashboard] Erreur Edge Function:', error)
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Désolé, une erreur est survenue lors du traitement de votre demande. Veuillez réessayer.',
          timestamp: new Date(),
        }
        addMessage(errorMessage)
        setIsAgentTyping(false)
        return
      }

      console.log('[Dashboard] Réponse Edge Function:', data)

      let responseContent = ''
      if (data) {
        if (data.response) {
          responseContent = typeof data.response === 'string' 
            ? data.response 
            : JSON.stringify(data.response)
        } else if (data.destination) {
          const destinationName = data.destination === 'BIBLIOTHECAIRE' 
            ? 'Bibliothécaire' 
            : data.destination === 'ANALYSTE' 
              ? 'Analyste' 
              : data.destination
          
          responseContent = `🔀 **Routeur** : Redirection vers l'agent **${destinationName}**\n\n${data.reasoning || data.message || 'Analyse de la requête en cours...'}`
        } else {
          responseContent = JSON.stringify(data, null, 2)
        }
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseContent || 'Aucune réponse reçue.',
        timestamp: new Date(),
        
        knowledge_type: data?.knowledge_type,
        validation_count: data?.validation_count || 0,
        agent_source: data?.agent_source,
        sources: data?.sources,
        
        documents_found: data?.documents_found,
        qa_memory_found: data?.qa_memory_found,
        processing_time_ms: data?.processing_time_ms,
        prompt_used: data?.prompt_used,
        prompt_resolution: data?.prompt_resolution,
        
        generation_mode: data?.generation_mode,
        cache_status: data?.cache_status,
        
        can_vote: data?.can_vote ?? true,
        vote_context: data?.vote_context || {
          question: content,
          answer: responseContent,
          source_ids: data?.sources?.map((s: { id?: string }) => s.id).filter(Boolean) || []
        },
        
        user_vote: null,
      }
      
      addMessage(assistantMessage)
      
    } catch (err) {
      console.error('[Dashboard] Erreur envoi message:', err)
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Une erreur inattendue est survenue. Veuillez réessayer.',
        timestamp: new Date(),
      }
      addMessage(errorMessage)
    } finally {
      setIsAgentTyping(false)
    }
  }

  const handleVoteComplete = (message: Message, voteType: 'up' | 'down', qaId?: string) => {
    console.log('[Dashboard] Vote complété:', { messageId: message.id, voteType, qaId })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 px-8 py-12 flex-shrink-0 bg-transparent border-b-0">
        <h1 className="font-serif text-4xl font-normal text-[#0B0F17] dark:text-stone-100 mb-2 max-w-3xl">
          Bonjour {userName},
        </h1>
      </header>

      {/* Zone Messages - Scrollable */}
      <div className="flex-1 overflow-y-auto px-8 pb-6">
        <div className="max-w-3xl mx-auto space-y-8 pt-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onVoteComplete={handleVoteComplete}
            />
          ))}

          {isAgentTyping && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#0B0F17] dark:bg-stone-200 flex items-center justify-center text-white dark:text-stone-800 font-serif italic text-sm flex-shrink-0 mt-1">
                A
              </div>
              <div className="bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 p-4 rounded-r-xl rounded-bl-xl shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-300 dark:bg-stone-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-300 dark:bg-stone-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-300 dark:bg-stone-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-8" />
        </div>
      </div>

      {/* Zone de Saisie */}
      <div className="flex-shrink-0 px-8 pb-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-[0_40px_70px_-15px_rgba(0,0,0,0.4)] ring-1 ring-black/5 dark:ring-white/10 p-4">
            <ChatInput
              onSendMessage={handleSendMessage}
              onSaveConversation={messages.length > 0 ? () => setShowSaveModal(true) : undefined}
              disabled={isAgentTyping}
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
