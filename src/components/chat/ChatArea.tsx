import { useAppStore } from '../../stores/appStore'
import { useAuth } from '../../hooks/useAuth'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { createSandboxItem } from '@/services/sandbox.service'
import { createEmptySandboxContent } from '@/types'
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

    // Simuler la réponse de l'agent (mock pour l'instant)
    setIsAgentTyping(true)

    // Simuler un délai de réponse
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Réponse mockée
    const mockResponse: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: generateMockResponse(content),
      timestamp: new Date(),
      knowledge_type: Math.random() > 0.5 ? 'shared' : 'new',
      validation_count: Math.floor(Math.random() * 50),
      agent_source: 'librarian',
      sources: [
        { document_id: '1', document_name: 'CCTP Lot 04', score: 0.92 },
        { document_id: '2', document_name: 'DTU 45.1', score: 0.87 },
      ]
    }
    addMessage(mockResponse)
    setIsAgentTyping(false)
  }

  // Ancrer un message dans le bac à sable (persisté dans Supabase)
  const handleAnchorMessage = async (message: Message) => {
    // Trouver la question correspondante
    const userQuestion = messages.find(
      m => m.role === 'user' && m.timestamp < message.timestamp
    )?.content || ''

    // Générer un titre à partir du contenu
    const title = generateTitleFromContent(message.content)

    // Créer le content pour le sandbox
    const content = createEmptySandboxContent(title, userQuestion)
    
    // Ajouter les messages de la conversation
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

    // Créer l'item dans Supabase
    const { data, error } = await createSandboxItem({
      title,
      project_id: activeProject?.id || null,
      content,
    })

    if (error) {
      console.error('Erreur lors de l\'ancrage:', error)
      // TODO: Afficher une notification d'erreur
      return
    }

    if (data) {
      console.log('Message ancré:', data.id)
      setMessageAnchored(message.id)
      // TODO: Afficher une notification de succès
    }
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
            />
          ))}

          {/* Indicateur de frappe */}
          {isAgentTyping && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-white font-serif italic text-sm flex-shrink-0 mt-1">
                L
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

// Helpers pour les mocks
function generateMockResponse(query: string): string {
  const lowerQuery = query.toLowerCase()

  if (lowerQuery.includes('cctp') || lowerQuery.includes('isolation')) {
    return `J'ai analysé le CCTP. Il y a effectivement un écart. Voici les points clés :
- CCTP : 120mm isolant
- DTU : 140mm requis

Cette différence de 20mm peut avoir des implications sur la performance thermique du bâtiment. Je vous recommande de signaler cette non-conformité au maître d'ouvrage.`
  }

  if (lowerQuery.includes('planning') || lowerQuery.includes('retard')) {
    return `D'après l'analyse du planning, le lot gros œuvre présente un retard de 3 jours. Les causes identifiées sont :
- Intempéries semaine 48
- Livraison béton décalée

Impact : Le second œuvre pourra débuter le 15/12 au lieu du 12/12. Je peux générer un planning de rattrapage si vous le souhaitez.`
  }

  return `J'ai bien reçu votre question concernant "${query.substring(0, 50)}...".

Laissez-moi analyser les documents du chantier pour vous fournir une réponse précise. En attendant, voici ce que je peux vous dire de manière générale :

Cette demande nécessite une vérification dans le CCTP et les DTU applicables. Souhaitez-vous que j'approfondisse un point particulier ?`
}

function generateTitleFromContent(content: string): string {
  // Extraire les premiers mots significatifs
  const words = content.split(' ').slice(0, 5).join(' ')
  if (words.length > 40) {
    return words.substring(0, 40) + '...'
  }
  return words + '...'
}
