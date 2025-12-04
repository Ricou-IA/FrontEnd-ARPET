// ============================================================
// ARPET - ConfirmDialog Component
// Version: 1.0.0 - Modal de confirmation personnalisé
// Date: 2025-12-04
// ============================================================

import { useEffect } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  
  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  // Config selon variant
  const variantConfig = {
    danger: {
      icon: <Trash2 className="w-6 h-6" />,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      confirmBg: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6" />,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      confirmBg: 'bg-orange-600 hover:bg-orange-700',
    },
    default: {
      icon: <AlertTriangle className="w-6 h-6" />,
      iconBg: 'bg-stone-100',
      iconColor: 'text-stone-600',
      confirmBg: 'bg-stone-800 hover:bg-black',
    },
  }

  const config = variantConfig[variant]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 pb-4">
          {/* Icône */}
          <div className={`flex-shrink-0 w-12 h-12 rounded-full ${config.iconBg} ${config.iconColor} flex items-center justify-center`}>
            {config.icon}
          </div>

          {/* Contenu */}
          <div className="flex-1 pt-1">
            <h3 className="text-lg font-semibold text-stone-900">
              {title}
            </h3>
            <p className="mt-2 text-sm text-stone-500 leading-relaxed">
              {message}
            </p>
          </div>

          {/* Bouton fermer */}
          <button
            onClick={onCancel}
            className="flex-shrink-0 p-1 text-stone-400 hover:text-stone-600 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-stone-50 border-t border-stone-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition ${config.confirmBg}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
