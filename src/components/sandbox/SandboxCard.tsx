// ============================================================
// ARPET - SandboxCard Component
// Version: 2.0.0 - UX Refonte (compact + icônes agent)
// Date: 2025-12-04
// ============================================================

import { useState } from 'react'
import { Check, X, Book, BarChart3, Loader2 } from 'lucide-react'
import type { SandboxItem } from '@/types'

interface SandboxCardProps {
  item: SandboxItem
  onValidate?: (item: SandboxItem) => void
  onDelete?: (item: SandboxItem) => void
  onClick?: (item: SandboxItem) => void
}

export function SandboxCard({ item, onValidate, onDelete, onClick }: SandboxCardProps) {
  const [isPinning, setIsPinning] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Déterminer le type d'agent (bibliothécaire ou analytique)
  const getAgentType = (): 'librarian' | 'analyst' => {
    // Si routine présente → analytique, sinon → bibliothécaire
    if (item.content.routine) return 'analyst'
    return 'librarian'
  }

  const agentType = getAgentType()

  // Icône et couleur selon le type d'agent
  const getAgentConfig = () => {
    if (agentType === 'analyst') {
      return {
        icon: <BarChart3 className="w-3.5 h-3.5" />,
        label: 'Analytique',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-600',
        borderColor: 'border-orange-200'
      }
    }
    return {
      icon: <Book className="w-3.5 h-3.5" />,
      label: 'Bibliothécaire',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    }
  }

  const agentConfig = getAgentConfig()

  // Date formatée
  const formattedDate = new Date(item.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })

  // Clic sur la carte
  const handleCardClick = () => {
    if (isPinning || isDeleting) return
    onClick?.(item)
  }

  // Bouton Épingler
  const handlePinClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isPinning || !onValidate) return
    
    setIsPinning(true)
    try {
      onValidate(item)
    } finally {
      setTimeout(() => setIsPinning(false), 2000)
    }
  }

  // Bouton Supprimer
  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isDeleting || !onDelete) return
    
    setIsDeleting(true)
    try {
      onDelete(item)
    } finally {
      setTimeout(() => setIsDeleting(false), 2000)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className={`
        bg-white rounded-lg border border-stone-200 p-4 relative group cursor-pointer
        hover:border-stone-300 hover:shadow-sm transition-all
        ${(isPinning || isDeleting) ? 'opacity-60 pointer-events-none' : ''}
      `}
    >
      {/* Header : Tag Agent + Actions */}
      <div className="flex justify-between items-center mb-3">
        {/* Tag Agent */}
        <div className={`
          inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
          ${agentConfig.bgColor} ${agentConfig.textColor} ${agentConfig.borderColor} border
        `}>
          {agentConfig.icon}
          <span>{agentConfig.label}</span>
        </div>

        {/* Actions (survol) */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onValidate && (
            <button
              onClick={handlePinClick}
              disabled={isPinning}
              className="p-1.5 text-stone-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-all"
              title="Épingler"
            >
              {isPinning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
              title="Supprimer"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Titre */}
      <h4 className="font-medium text-stone-800 text-sm line-clamp-2 mb-2">
        {item.title}
      </h4>

      {/* Date */}
      <span className="text-xs text-stone-400">{formattedDate}</span>
    </div>
  )
}

// ============================================
// Ghost Card (Création)
// ============================================

interface GhostCardProps {
  onClick?: () => void
  disabled?: boolean
}

export function GhostCard({ onClick, disabled = false }: GhostCardProps) {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick()
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        border-2 border-dashed border-stone-200 rounded-lg 
        flex flex-col items-center justify-center p-4 
        text-stone-400 hover:border-stone-300 hover:bg-stone-50 
        transition-all min-h-[100px] group
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
      `}
    >
      <div className={`
        w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center mb-2 
        ${disabled ? '' : 'group-hover:scale-110 group-hover:bg-stone-200'} transition-all
      `}>
        {disabled ? (
          <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
      </div>
      <span className="text-xs font-medium">
        {disabled ? 'Création...' : 'Nouveau'}
      </span>
    </button>
  )
}
