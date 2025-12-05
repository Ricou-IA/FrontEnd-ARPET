// ============================================================
// ARPET - ChatArea Component
// Version: 2.1.0 - Fix: Ajout mapping vote_context + can_vote
// Date: 2025-12-05
// ============================================================

import { useAppStore } from '../../stores/appStore'
import { useAuth } from '../../hooks/useAuth'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { createSandboxItem } from '@/services/sandbox.service'
import { createEmptySandboxContent } from '@/types'
import { supabase } from '../../lib/supabase'
import type { Message } from '../../types'

// Anecdotes BTP pour la zone "Ambiance"
const anecdotes = [
  "Saviez-vous que le béton romain se renforce avec le temps grâce à l'eau de mer ? Une durabilité inspirante pour nos ouvrages modernes.",
  "La Tour Eiffel grandit de 15 cm en été ! La dilatation thermique de ses 7 300 tonnes d'acier n'a pas été un oubli de Gustave.",
  "Le Colisée de Rome a été construit en seulement 8 ans avec 100 000 mètres cubes de travertin. Un record de rapidité antique.",
  "Le plus vieux pont en pierre encore debout date de 850 av. J.-C. en Turquie. 2 875 ans de service sans maintenance majeure.",
  "Le ciment Portland doit son nom à sa ressemblance avec la pierre de l'île de Portland. Un choix marketing du XIXe siècle.",
]

export function ChatArea() {
  const { profile } = useAuth()
  const {
    messages,
    addMessage,
    setMessageAnchored,
    activeProject,
    isAgentTyping,
    setIsAgentTyping
  } = useAppStore()

  // Date formatée
  const today = new Date()
  const formattedDate = today.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  // Première lettre en majuscule
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  // Anecdote du jour (basée sur le jour)
  const anecdoteIndex = today.getDate() % anecdotes.length
  const anecdote = anecdotes[anecdoteIndex]

  // Prénom de l'utilisateur
  const firstName = profile?.full_name?.split(' ')[0] || 'vous'

  // Envoyer un message
  const handleSendMessage = async (content: string, _files?: File[]) => {
    if (!content.trim()) return

    // Ajouter le message utilisateur
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    addMessage(userMessage)

    // Afficher l'indicateur de frappe
    setIsAgentTyping(true)

    try {
      // Récupérer le user_id directement depuis la session Supabase (plus fiable)
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id || null
      
      console.log('[ChatArea] User ID:', userId)
      
      // Appeler la Edge Function 'baikal-brain'
      const { data, error } = await supabase.functions.invoke('baikal-brain', {
        body: {
          query: content,
          user_id: userId,
          org_id: profile?.org_id || null,
          project_id: activeProject?.id || null,
        }
      })

      if (error) {
        console.error('[ChatArea] Erreur Edge Function:', error)
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

      console.log('[ChatArea] Réponse Edge Function:', data)

      // Traiter la réponse
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

      // ================================================================
      // FIX v2.1: Mapping complet incluant vote_context et can_vote
      // ================================================================
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseContent || 'Aucune réponse reçue.',
        timestamp: new Date(),
        
        // Metadata existantes
        knowledge_type: data?.knowledge_type,
        validation_count: data?.validation_count || 0,
        agent_source: data?.agent_source,
        sources: data?.sources,
        
        // Nouvelles metadata v2
        documents_found: data?.documents_found,
        qa_memory_found: data?.qa_memory_found,
        processing_time_ms: data?.processing_time_ms,
        prompt_used: data?.prompt_used,
        prompt_resolution: data?.prompt_resolution,
        
        // ✅ FIX: Ajout du système de vote
        can_vote: data?.can_vote ?? true,  // Par défaut true si non spécifié
        vote_context: data?.vote_context || {
          question: content,
          answer: responseContent,
          source_ids: data?.sources?.map((s: { id?: string }) => s.id).filter(Boolean) || []
        },
        
        // État UI
        user_vote: null,
        isAnchored: false,
      }
      
      addMessage(assistantMessage)
      
    } catch (err) {
      console.error('[ChatArea] Erreur envoi message:', err)
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

  // Ancrer un message dans le bac à sable
  const handleAnchorMessage = async (message: Message) => {
    // Trouver la question correspondante
    const userQuestion = messages.find(
      m => m.role === 'user' && m.timestamp < message.timestamp
    )?.content || ''

    const title = generateTitleFromContent(message.content)

    const content = createEmptySandboxContent(title, userQuestion)
    
    if (userQuestion) {
      content.messages.push({
        role: 'user',
        text: userQuestion,
        at: new Date().toISOString(),
      })
    }
    content.messages.push({
      role: 'agent',
      text: message.content,
      at: new Date().toISOString(),
    })

    const { data, error } = await createSandboxItem({
      title,
      project_id: activeProject?.id || null,
      content,
    })

    if (error) {
      console.error('[ChatArea] Erreur ancrage:', error)
      return
    }

    if (data) {
      console.log('[ChatArea] Message ancré:', data.id)
      setMessageAnchored(message.id)
    }
  }

  // Callback quand un vote est complété
  const handleVoteComplete = (message: Message, voteType: 'up' | 'down', qaId?: string) => {
    console.log('[ChatArea] Vote complété:', { messageId: message.id, voteType, qaId })
    // Optionnel: mettre à jour l'état du message dans le store si nécessaire
  }

  return (
    <div className="flex-1 overflow-y-auto w-full">

      {/* Zone Anecdote */}
      <div className="w-full px-[10%] xl:px-[15%] pt-10 pb-4">
        <div className="w-full max-w-3xl border-l-4 border-stone-300 pl-6 py-1 mx-auto sm:mx-0">
          <p className="uppercase tracking-wide text-xs font-black text-stone-600 mb-2">
            {capitalizedDate}
          </p>
          <p className="italic text-stone-500 font-light text-xs leading-relaxed text-justify">
            "{anecdote}"
          </p>
        </div>
      </div>

      {/* Zone Chat */}
      <div className="pt-8 pb-4 px-[10%] xl:px-[15%]">
        <div className="max-w-3xl mx-auto sm:mx-0 space-y-8">

          {/* Salutation */}
          <h2 className="font-serif text-5xl text-stone-800 mb-6 text-left tracking-tight">
            Bonjour {firstName},
          </h2>

          {/* Messages */}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onAnchor={handleAnchorMessage}
              onVoteComplete={handleVoteComplete}
            />
          ))}

          {/* Indicateur de frappe */}
          {isAgentTyping && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-white font-serif italic text-sm flex-shrink-0 mt-1">
                A
              </div>
              <div className="bg-white border border-stone-100 p-4 rounded-r-xl rounded-bl-xl shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isAgentTyping}
          />
        </div>
      </div>
    </div>
  )
}

// Helper pour générer un titre à partir du contenu
function generateTitleFromContent(content: string): string {
  const words = content.split(' ').slice(0, 5).join(' ')
  if (words.length > 40) {
    return words.substring(0, 40) + '...'
  }
  return words + '...'
}
