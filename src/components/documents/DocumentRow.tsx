// ============================================================
// ARPET - DocumentRow Component
// Version: 1.0.1 - Fix TypeScript errors (title prop, unused import)
// Date: 2025-12-18
// ============================================================

import { useState } from 'react'
import { 
  Eye, 
  Download, 
  Upload, 
  Trash2, 
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { 
  LAYER_CONFIG, 
  CATEGORY_CONFIG,
  getFileIcon, 
  formatFileSize,
  getPromotionBadge,
  type SourceFile 
} from '@/types'

interface DocumentRowProps {
  document: SourceFile
}

export function DocumentRow({ document }: DocumentRowProps) {
  const { documentsActiveLayer, deleteDocument, requestDocumentPromotion } = useAppStore()
  
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPromoting, setIsPromoting] = useState(false)

  const layerConfig = LAYER_CONFIG[documentsActiveLayer]
  const category = document.metadata?.category
  const categoryConfig = category ? CATEGORY_CONFIG[category] : null
  const promotionBadge = getPromotionBadge(document.promotion_status)

  // Date formatée
  const formattedDate = new Date(document.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  // Handlers
  const handleView = () => {
    // TODO: Ouvrir le Split View (Phase 1.3)
    console.log('View document:', document.id)
  }

  const handleDownload = async () => {
    // TODO: Télécharger le fichier
    console.log('Download document:', document.id)
  }

  const handlePromote = async () => {
    if (isPromoting) return
    if (document.promotion_status !== 'draft') return

    setIsPromoting(true)
    try {
      await requestDocumentPromotion(document.id, 'Demande de promotion')
    } finally {
      setIsPromoting(false)
    }
  }

  const handleDelete = async () => {
    if (isDeleting) return
    if (!confirm(`Supprimer "${document.original_filename}" ?`)) return

    setIsDeleting(true)
    try {
      await deleteDocument(document.id)
    } finally {
      setIsDeleting(false)
    }
  }

  // Icône de statut de processing (wrappée dans span pour le title)
  const renderProcessingStatus = () => {
    switch (document.processing_status) {
      case 'pending':
        return (
          <span title="En attente de traitement">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
          </span>
        )
      case 'processing':
        return (
          <span title="En cours de traitement">
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
          </span>
        )
      case 'completed':
        return (
          <span title="Traité">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          </span>
        )
      case 'error':
        return (
          <span title={document.processing_error || 'Erreur'}>
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors group">
      {/* Type (icône MIME) */}
      <div className="col-span-1">
        <span className="text-xl" title={document.mime_type || 'Document'}>
          {getFileIcon(document.mime_type)}
        </span>
      </div>

      {/* Nom */}
      <div className="col-span-5 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
            {document.original_filename}
          </p>
          {renderProcessingStatus()}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-stone-400 dark:text-stone-500">
            {formatFileSize(document.file_size)}
          </span>
          {document.chunk_count > 0 && (
            <span className="text-xs text-stone-400 dark:text-stone-500">
              • {document.chunk_count} chunks
            </span>
          )}
          {/* Badge promotion */}
          {promotionBadge && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${promotionBadge.bgColor} ${promotionBadge.color}`}>
              {promotionBadge.label}
            </span>
          )}
        </div>
      </div>

      {/* Catégorie */}
      <div className="col-span-2">
        {categoryConfig ? (
          <span className="inline-flex items-center gap-1 text-xs text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded">
            {categoryConfig.icon} {categoryConfig.label}
          </span>
        ) : (
          <span className="text-xs text-stone-400 dark:text-stone-500">—</span>
        )}
      </div>

      {/* Date */}
      <div className="col-span-2">
        <span className="text-sm text-stone-500 dark:text-stone-400">
          {formattedDate}
        </span>
      </div>

      {/* Actions */}
      <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Voir */}
        <button
          onClick={handleView}
          className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
          title="Voir"
        >
          <Eye className="w-4 h-4" />
        </button>

        {/* Télécharger */}
        {layerConfig.canDownload && (
          <button
            onClick={handleDownload}
            className="p-1.5 text-stone-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition"
            title="Télécharger"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        {/* Proposer (promotion) */}
        {layerConfig.canPromote && document.promotion_status === 'draft' && (
          <button
            onClick={handlePromote}
            disabled={isPromoting}
            className="p-1.5 text-stone-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition disabled:opacity-50"
            title="Proposer à l'équipe"
          >
            {isPromoting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Supprimer */}
        {layerConfig.canDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition disabled:opacity-50"
            title="Supprimer"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}
