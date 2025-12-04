// ============================================================
// ARPET - SandboxCard Component
// Version: 1.4.0 - Simplified and robust
// Date: 2025-12-04
// ============================================================

import { useState } from 'react'
import { Check, X, MessageSquare, BarChart3, FileText, Loader2 } from 'lucide-react'
import type { SandboxItem, SandboxContent } from '@/types'

interface SandboxCardProps {
  item: SandboxItem
  onValidate?: (item: SandboxItem) => void
  onDelete?: (item: SandboxItem) => void
  onClick?: (item: SandboxItem) => void
  isNew?: boolean
}

export function SandboxCard({ item, onValidate, onDelete, onClick, isNew = false }: SandboxCardProps) {
  const [isPinning, setIsPinning] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Déterminer le type basé sur le contenu
  const getItemType = (content: SandboxContent): string => {
    if (content.routine) return 'analysis'
    if (content.messages && content.messages.length > 0) return 'conversation'
    return 'note'
  }

  const itemType = getItemType(item.content)

  // Couleur du badge selon le type
  const getTypeColor = () => {
    switch (itemType) {
      case 'analysis': return 'bg-orange-400'
      case 'conversation': return 'bg-blue-400'
      default: return 'bg-green-400'
    }
  }

  // Icône selon le type
  const getTypeIcon = () => {
    switch (itemType) {
      case 'analysis': return <BarChart3 className="w-3 h-3" />
      case 'conversation': return <MessageSquare className="w-3 h-3" />
      default: return <FileText className="w-3 h-3" />
    }
  }

  // Label du type
  const getTypeLabel = () => {
    switch (itemType) {
      case 'analysis': return 'Analyse'
      case 'conversation': return 'Échange'
      default: return 'Note'
    }
  }

  // Extraire un résumé du contenu
  const getSummary = (): string => {
    const content = item.content
    if (content.objective && content.objective !== item.title) {
      return content.objective.length > 100 ? content.objective.substring(0, 100) + '...' : content.objective
    }
    if (content.initial_prompt) {
      return content.initial_prompt.length > 100 ? content.initial_prompt.substring(0, 100) + '...' : content.initial_prompt
    }
    return 'Cliquez pour ouvrir'
  }

  // Date formatée
  const formattedDate = new Date(item.updated_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })

  // Clic sur la carte (ouvrir éditeur)
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
      // Le composant sera démonté si succès, donc pas besoin de reset
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
        widget-card bg-white rounded-xl border border-stone-200 p-5 relative group cursor-pointer
        hover:border-stone-300 transition-all
        ${isNew ? 'animate-enter ring-2 ring-green-200' : ''}
        ${(isPinning || isDeleting) ? 'opacity-60 pointer-events-none' : ''}
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${getTypeColor()}`} />
          <span className="text-xs font-semibold uppercase text-stone-500 tracking-wider flex items-center gap-1">
            {getTypeIcon()}
            {getTypeLabel()}
          </span>
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onValidate && (
            <button
              onClick={handlePinClick}
              disabled={isPinning}
              className="p-1.5 text-stone-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
              title="Épingler"
            >
              {isPinning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Supprimer"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Titre */}
      <h4 className="font-medium text-stone-800 mb-2 line-clamp-1">{item.title}</h4>

      {/* Résumé */}
      <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{getSummary()}</p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100">
        <span className="text-[10px] text-stone-400">{formattedDate}</span>
        {item.content.routine && (
          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">Auto</span>
        )}
      </div>
    </div>
  )
}

// ============================================
// Ghost Card
// ============================================

interface GhostCardProps {
  onClick?: () => void
  disabled?: boolean
}

export function GhostCard({ onClick, disabled = false }: GhostCardProps) {
  const handleClick = () => {
    console.log('🖱️ GhostCard clicked', { disabled, hasOnClick: !!onClick })
    if (!disabled && onClick) {
      onClick()
    } else {
      console.log('⚠️ GhostCard click ignored', { disabled, hasOnClick: !!onClick })
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        border-2 border-dashed border-stone-200 rounded-xl 
        flex flex-col items-center justify-center p-5 
        text-stone-400 hover:border-stone-300 hover:bg-white/50 
        transition-all min-h-[140px] group
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
      `}
    >
      <div className={`w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mb-2 
        ${disabled ? '' : 'group-hover:scale-110 group-hover:bg-stone-200'} transition-all`}>
        {disabled ? (
          <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
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
