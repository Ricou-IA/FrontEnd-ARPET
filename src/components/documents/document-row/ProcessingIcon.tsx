// ============================================================
// ARPET - Processing Status Icon
// ============================================================

import { Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface ProcessingIconProps {
  status: string
  error?: string | null
}

export function ProcessingIcon({ status, error }: ProcessingIconProps) {
  switch (status) {
    case 'pending':
      return (
        <span title="En attente">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
        </span>
      )
    case 'processing':
      return (
        <span title="En cours">
          <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
        </span>
      )
    case 'completed':
      return (
        <span title="Traité">
          <CheckCircle className="w-3.5 h-3.5 text-gray-600" />
        </span>
      )
    case 'error':
      return (
        <span title={error || 'Erreur'}>
          <AlertCircle className="w-3.5 h-3.5 text-gray-600" />
        </span>
      )
    default:
      return null
  }
}
