import { Check, X, MessageSquare, BarChart3, FileText, GitCompare, Quote } from 'lucide-react'
import type { SandboxItem, SandboxContent } from '@/types'

interface SandboxCardProps {
  item: SandboxItem
  onValidate?: (item: SandboxItem) => void
  onDelete?: (item: SandboxItem) => void
  onClick?: (item: SandboxItem) => void
  isNew?: boolean
}

export function SandboxCard({ item, onValidate, onDelete, onClick, isNew = false }: SandboxCardProps) {
  
  // Déterminer le type basé sur le contenu
  const getItemType = (content: SandboxContent): string => {
    if (content.routine) return 'analysis'
    if (content.messages && content.messages.length > 0) return 'conversation'
    return 'note'
  }

  const itemType = getItemType(item.content)

  // Couleur du badge selon le type
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'analysis':
        return 'bg-orange-400'
      case 'comparison':
        return 'bg-blue-400'
      case 'note':
        return 'bg-green-400'
      case 'extract':
        return 'bg-purple-400'
      case 'conversation':
        return 'bg-stone-400'
      default:
        return 'bg-stone-400'
    }
  }

  // Icône selon le type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'analysis':
        return <BarChart3 className="w-3 h-3" />
      case 'comparison':
        return <GitCompare className="w-3 h-3" />
      case 'note':
        return <FileText className="w-3 h-3" />
      case 'extract':
        return <Quote className="w-3 h-3" />
      case 'conversation':
        return <MessageSquare className="w-3 h-3" />
      default:
        return <FileText className="w-3 h-3" />
    }
  }

  // Label du type
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'analysis':
        return 'Analyse'
      case 'comparison':
        return 'Comparatif'
      case 'note':
        return 'Note'
      case 'extract':
        return 'Extrait'
      case 'conversation':
        return 'Échange'
      default:
        return 'Brouillon'
    }
  }

  // Extraire un résumé du contenu
  const getSummary = (): string => {
    const content = item.content

    // Objectif défini
    if (content.objective && content.objective !== item.title) {
      return content.objective
    }

    // Derniers messages
    if (content.messages && content.messages.length > 0) {
      const lastMessage = content.messages[content.messages.length - 1]
      const text = lastMessage.text
      return text.length > 100 ? text.substring(0, 100) + '...' : text
    }

    // Résultat affiché
    if (content.display?.result_data) {
      if (typeof content.display.result_data === 'string') {
        return content.display.result_data.substring(0, 100) + '...'
      }
      return 'Résultat disponible'
    }

    // Prompt initial
    if (content.initial_prompt) {
      return content.initial_prompt.length > 100 
        ? content.initial_prompt.substring(0, 100) + '...'
        : content.initial_prompt
    }

    return 'Cliquez pour ouvrir'
  }

  // Nombre de messages
  const messageCount = item.content.messages?.length || 0

  // Date de mise à jour formatée
  const updatedAt = new Date(item.updated_at)
  const formattedDate = updatedAt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <div
      onClick={() => onClick?.(item)}
      className={`
        widget-card bg-white rounded-xl border border-stone-200 p-5 relative group
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        ${isNew ? 'animate-enter' : ''}
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${getTypeColor(itemType)}`} />
          <span className="text-xs font-semibold uppercase text-stone-500 tracking-wider flex items-center gap-1">
            {getTypeIcon(itemType)}
            {getTypeLabel(itemType)}
          </span>
        </div>

        {/* Actions au survol */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          {item.status === 'draft' && onValidate && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onValidate(item)
              }}
              className="p-1.5 text-stone-300 hover:text-green-600 hover:bg-green-50 rounded transition"
              title="Épingler dans l'Espace de Travail"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(item)
              }}
              className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded transition"
              title="Supprimer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Titre */}
      <h4 className="font-medium text-stone-800 mb-2 line-clamp-1">
        {item.title}
      </h4>

      {/* Résumé */}
      <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
        {getSummary()}
      </p>

      {/* Footer avec métadonnées */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100">
        <div className="flex items-center gap-3 text-[10px] text-stone-400">
          {messageCount > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {messageCount}
            </span>
          )}
          <span>{formattedDate}</span>
        </div>

        {/* Indicateur de routine */}
        {item.content.routine && (
          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
            Auto
          </span>
        )}
      </div>

      {/* Badge de statut pour les items épinglés */}
      {item.status === 'pinned' && (
        <div className="absolute top-2 right-2">
          <span className="bg-green-100 text-green-600 text-[10px] px-2 py-0.5 rounded-full font-medium">
            Épinglé
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================
// Ghost Card pour créer un nouveau brouillon
// ============================================

interface GhostCardProps {
  onClick?: () => void
  disabled?: boolean
}

export function GhostCard({ onClick, disabled = false }: GhostCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        border-2 border-dashed border-stone-200 rounded-xl 
        flex flex-col items-center justify-center p-5 
        text-stone-400 hover:border-stone-300 hover:bg-white/50 
        transition min-h-[140px] group
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <div className={`
        w-10 h-10 rounded-full bg-stone-100 
        flex items-center justify-center mb-2 
        ${disabled ? '' : 'group-hover:scale-110'} 
        transition
      `}>
        {disabled ? (
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
      </div>
      <span className="text-xs font-medium">
        {disabled ? 'Création...' : 'Nouveau brouillon'}
      </span>
    </button>
  )
}
