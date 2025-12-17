// ============================================================
// ARPET - ResetConversationModal Component
// Version: 1.0.0 - Quick Win: Modal confirmation reset
// Date: 2025-12-17
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, X, Trash2 } from 'lucide-react'

interface ResetConversationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  messageCount?: number
}

export function ResetConversationModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  messageCount = 0 
}: ResetConversationModalProps) {
  const [isClosing, setIsClosing] = useState(false)

  // Gestion fermeture avec animation
  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 150)
  }, [onClose])

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, handleClose])

  // Bloquer le scroll du body quand ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    handleClose()
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-150 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div 
        className={`relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-150 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-stone-800">
              Nouvelle conversation
            </h3>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-stone-100 rounded-full transition text-stone-400 hover:text-stone-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-stone-600 text-sm leading-relaxed">
            Êtes-vous sûr de vouloir démarrer une nouvelle conversation ?
          </p>
          {messageCount > 0 && (
            <p className="mt-2 text-stone-500 text-sm">
              <span className="font-medium text-stone-700">{messageCount} message{messageCount > 1 ? 's' : ''}</span> 
              {' '}sera{messageCount > 1 ? 'ont' : ''} supprimé{messageCount > 1 ? 's' : ''} de cette session.
            </p>
          )}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              💡 <strong>Astuce :</strong> Utilisez le bouton "Ancrer" sur les réponses importantes 
              pour les sauvegarder dans votre Bac à Sable avant de réinitialiser.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 border-t border-stone-100 bg-stone-50/50 rounded-b-2xl">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-stone-600 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResetConversationModal
