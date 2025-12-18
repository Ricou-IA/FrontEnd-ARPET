// ============================================================
// ARPET - DocumentRow Component
// Version: 2.2.1 - Fix Lucide title prop
// Date: 2025-12-18
// ============================================================

import { useState, useEffect } from 'react'
import { 
  Eye, 
  Download, 
  Upload, 
  Trash2, 
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  Pencil,
  X,
  Check
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { 
  LAYER_CONFIG, 
  getFileIcon, 
  formatFileSize,
  getPromotionBadge,
  isEmojiIcon,
  type SourceFile,
  type ViewerDocument
} from '@/types'
import { getFileDownloadUrl } from '@/services/documents.service'

interface DocumentRowProps {
  document: SourceFile
}

export function DocumentRow({ document }: DocumentRowProps) {
  const { 
    documentsActiveLayer, 
    deleteDocument, 
    requestDocumentPromotion,
    updateDocument,
    userProjects,
    fetchUserProjects,
    availableCategories,
    fetchDocumentCategories,
    openViewer
  } = useAppStore()
  
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPromoting, setIsPromoting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)

  const [editFilename, setEditFilename] = useState(document.original_filename)
  const [editCategoryId, setEditCategoryId] = useState<string>(
    (document.metadata?.category as string) || ''
  )
  const [editProjectId, setEditProjectId] = useState<string | null>(document.project_id)

  const layerConfig = LAYER_CONFIG[documentsActiveLayer]
  
  const categoryId = document.metadata?.category as string | undefined
  const categoryConfig = categoryId 
    ? availableCategories.find(c => c.id === categoryId)
    : null
  
  const promotionBadge = getPromotionBadge(document.promotion_status)

  useEffect(() => {
    if (isEditing) {
      if (userProjects.length === 0) fetchUserProjects()
      if (availableCategories.length === 0) fetchDocumentCategories()
    }
  }, [isEditing, userProjects.length, availableCategories.length, fetchUserProjects, fetchDocumentCategories])

  const resetForm = () => {
    setEditFilename(document.original_filename)
    setEditCategoryId((document.metadata?.category as string) || '')
    setEditProjectId(document.project_id)
    setIsEditing(false)
  }

  const formattedDate = new Date(document.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  // Ouvrir le document dans le Split View
  const handleView = async () => {
    if (isLoadingUrl || !document.storage_path) return
    
    setIsLoadingUrl(true)
    try {
      const { data: url, error } = await getFileDownloadUrl(
        document.storage_bucket,
        document.storage_path
      )

      if (error || !url) {
        console.error('Error getting file URL:', error)
        return
      }

      const viewerDoc: ViewerDocument = {
        id: document.id,
        filename: document.original_filename,
        url: url,
        mimeType: document.mime_type,
        fileSize: document.file_size,
      }

      openViewer(viewerDoc)
    } finally {
      setIsLoadingUrl(false)
    }
  }

  // Télécharger le document
  const handleDownload = async () => {
    if (!document.storage_path) return

    try {
      const { data: url, error } = await getFileDownloadUrl(
        document.storage_bucket,
        document.storage_path
      )

      if (error || !url) {
        console.error('Error getting download URL:', error)
        return
      }

      // Ouvrir dans un nouvel onglet pour télécharger
      const link = window.document.createElement('a')
      link.href = url
      link.download = document.original_filename
      link.target = '_blank'
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
    } catch (err) {
      console.error('Download error:', err)
    }
  }

  const handlePromote = async () => {
    if (isPromoting || document.promotion_status !== 'draft') return
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

  const handleSaveEdit = async () => {
    if (isSaving) return
    const currentCategoryId = (document.metadata?.category as string) || ''
    const hasChanges = 
      editFilename !== document.original_filename ||
      editCategoryId !== currentCategoryId ||
      editProjectId !== document.project_id

    if (!hasChanges) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await updateDocument(document.id, {
        filename: editFilename !== document.original_filename ? editFilename : undefined,
        categoryId: editCategoryId !== currentCategoryId ? editCategoryId : undefined,
        projectId: editProjectId !== document.project_id ? editProjectId : undefined,
      })
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  // Icône de statut de processing (wrappée dans span pour le title)
  const ProcessingIcon = () => {
    switch (document.processing_status) {
      case 'pending':
        return (
          <span title="En attente">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
          </span>
        )
      case 'processing':
        return (
          <span title="En cours">
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

  const getCategoryIcon = () => {
    if (!categoryConfig?.icon) return '📄'
    return isEmojiIcon(categoryConfig.icon) ? categoryConfig.icon : '📄'
  }

  // Mode édition
  if (isEditing) {
    return (
      <tr className="bg-blue-50 dark:bg-blue-900/20">
        <td className="py-3">
          <span className="text-xl">{getFileIcon(document.mime_type)}</span>
        </td>
        <td className="py-3 px-2">
          <input
            type="text"
            value={editFilename}
            onChange={(e) => setEditFilename(e.target.value)}
            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600 text-stone-800 dark:text-stone-200"
          />
        </td>
        <td className="py-3 px-2">
          <select
            value={editProjectId || ''}
            onChange={(e) => setEditProjectId(e.target.value || null)}
            className="w-full px-1 py-1.5 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded text-stone-800 dark:text-stone-200"
          >
            <option value="">Aucun</option>
            {userProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </td>
        <td className="py-3 px-2">
          <select
            value={editCategoryId}
            onChange={(e) => setEditCategoryId(e.target.value)}
            className="w-full px-1 py-1.5 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded text-stone-800 dark:text-stone-200"
          >
            <option value="">Aucune</option>
            {availableCategories.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </td>
        <td className="py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={resetForm}
              disabled={isSaving}
              className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  // Mode affichage
  return (
    <tr className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition group border-b border-stone-50 dark:border-stone-800/50">
      <td className="py-3">
        <span className="text-xl">{getFileIcon(document.mime_type)}</span>
      </td>
      
      <td className="py-3 px-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
            {document.original_filename}
          </span>
          <ProcessingIcon />
          {promotionBadge && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${promotionBadge.bgColor} ${promotionBadge.color}`}>
              {promotionBadge.label}
            </span>
          )}
        </div>
        <div className="text-xs text-stone-400 dark:text-stone-500">
          {formatFileSize(document.file_size)}
          {document.chunk_count > 0 && ` • ${document.chunk_count} chunks`}
        </div>
      </td>
      
      <td className="py-3 px-2 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
        {formattedDate}
      </td>
      
      <td className="py-3 px-2">
        {categoryConfig ? (
          <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400" title={categoryConfig.label}>
            <span>{getCategoryIcon()}</span>
            <span className="truncate">{categoryConfig.label}</span>
          </div>
        ) : (
          <span className="text-xs text-stone-400">—</span>
        )}
      </td>
      
      <td className="py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Bouton Voir - ouvre le Split View */}
          <button 
            onClick={handleView} 
            disabled={isLoadingUrl || !document.storage_path}
            className="p-1.5 text-stone-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded disabled:opacity-40 disabled:cursor-not-allowed" 
            title="Voir"
          >
            {isLoadingUrl ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
          
          {layerConfig.canDownload && (
            <button 
              onClick={handleDownload} 
              disabled={!document.storage_path}
              className="p-1.5 text-stone-500 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 rounded disabled:opacity-40 disabled:cursor-not-allowed" 
              title="Télécharger"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          
          {documentsActiveLayer === 'user' && (
            <button onClick={() => setIsEditing(true)} className="p-1.5 text-stone-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Modifier">
              <Pencil className="w-4 h-4" />
            </button>
          )}
          
          {layerConfig.canPromote && document.promotion_status === 'draft' && (
            <button onClick={handlePromote} disabled={isPromoting} className="p-1.5 text-stone-500 hover:text-green-600 hover:bg-green-50 rounded" title="Proposer">
              {isPromoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            </button>
          )}
          
          {layerConfig.canDelete && (
            <button onClick={handleDelete} disabled={isDeleting} className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded" title="Supprimer">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
