import { Bookmark, Copy, ThumbsUp, ThumbsDown, Zap } from 'lucide-react'
import type { Message } from '../../types'

interface MessageBubbleProps {
  message: Message
  onAnchor?: (message: Message) => void
  onVoteUp?: (message: Message) => void
  onVoteDown?: (message: Message) => void
}

export function MessageBubble({ message, onAnchor, onVoteUp, onVoteDown }: MessageBubbleProps) {
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

  // Message assistant
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
  }

  const handleAnchor = () => {
    if (onAnchor && !message.isAnchored) {
      onAnchor(message)
    }
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
          
          {/* Header "Waze Effect" - seulement pour savoir partagé */}
          {message.knowledge_type === 'shared' && (
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-100">
              <span className="bg-green-50 text-green-700 border border-green-100 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                Savoir Partagé
              </span>
              {message.validation_count !== undefined && message.validation_count > 0 && (
                <span className="text-[10px] text-stone-400 font-medium">
                  Validé par {message.validation_count} conducteur{message.validation_count > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {/* Badge "Nouveau" pour les nouvelles réponses */}
          {message.knowledge_type === 'new' && (
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-100">
              <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] px-2 py-0.5 rounded-full font-bold">
                Nouvelle réponse
              </span>
            </div>
          )}

          {/* Contenu du message */}
          <div 
            className="prose prose-sm prose-stone max-w-none"
            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
          />

          {/* Sources si présentes */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-2 border-t border-stone-100">
              <p className="text-[10px] text-stone-400 font-medium mb-1">Sources :</p>
              <div className="flex flex-wrap gap-1">
                {message.sources.map((source, index) => (
                  <span 
                    key={index}
                    className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded"
                  >
                    {source.document_name || `Document ${index + 1}`}
                    {source.score && ` (${Math.round(source.score * 100)}%)`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Barre d'outils */}
        <div className="flex items-center justify-between mt-2 opacity-100 transition-opacity">
          {/* Actions */}
          <div className="flex gap-2">
            <button 
              onClick={handleAnchor}
              disabled={message.isAnchored}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                message.isAnchored 
                  ? 'bg-green-100 text-green-600 cursor-default' 
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
              }`}
              title={message.isAnchored ? 'Déjà ancré' : 'Ancrer dans le Bac à Sable'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${message.isAnchored ? 'fill-current' : ''}`} />
              {message.isAnchored ? 'Ancré' : 'Ancrer'}
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
              onClick={() => onVoteUp?.(message)}
              className="p-1.5 hover:bg-green-50 hover:text-green-600 text-stone-300 rounded-full transition"
              title="Réponse utile"
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-stone-400 min-w-[20px] text-center">
              {message.validation_count || 0}
            </span>
            <button 
              onClick={() => onVoteDown?.(message)}
              className="p-1.5 hover:bg-red-50 hover:text-red-500 text-stone-300 rounded-full transition"
              title="Réponse incorrecte"
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Fonction pour formater le contenu (markdown basique)
function formatContent(content: string): string {
  // Convertir les listes à puces
  let formatted = content.replace(/^- (.+)$/gm, '<li>$1</li>')
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
