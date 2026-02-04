// ============================================================
// ARPET - DocumentRow Component
// Version: 2.5.0 - Affichage document_title + extension
// Date: 2025-01-15
// ============================================================

import { useState, useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'
import { LAYER_CONFIG, type SourceFile, type ViewerDocument } from '@/types'
import { getFileDownloadUrl } from '@/services/documents.service'
import { DocumentRowView } from './document-row/DocumentRowView'
import { DocumentRowEdit } from './document-row/DocumentRowEdit'

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

  // v2.3.0: Permissions depuis la DB
  const canEdit = document.can_edit ?? false
  const canDelete = document.can_delete ?? false

  // v2.5.0: Nom d'affichage = document_title.extension ou fallback original_filename
  const displayName = document.metadata?.document_title
    ? `${document.metadata.document_title}.${document.original_filename.split('.').pop()}`
    : document.original_filename

  const formattedDate = new Date(document.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  // v2.3.0: Charger les catégories au montage
  useEffect(() => {
    if (availableCategories.length === 0) {
      fetchDocumentCategories()
    }
  }, [availableCategories.length, fetchDocumentCategories])

  // v2.3.0: Charger les projets seulement en mode édition
  useEffect(() => {
    if (isEditing && userProjects.length === 0) {
      fetchUserProjects()
    }
  }, [isEditing, userProjects.length, fetchUserProjects])

  const resetForm = () => {
    setEditFilename(document.original_filename)
    setEditCategoryId((document.metadata?.category as string) || '')
    setEditProjectId(document.project_id)
    setIsEditing(false)
  }

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
    if (!confirm(`Supprimer "${displayName}" ?`)) return
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

  if (isEditing) {
    return (
      <DocumentRowEdit
        editFilename={editFilename}
        editProjectId={editProjectId}
        editCategoryId={editCategoryId}
        isSaving={isSaving}
        userProjects={userProjects}
        availableCategories={availableCategories}
        onFilenameChange={setEditFilename}
        onProjectChange={setEditProjectId}
        onCategoryChange={setEditCategoryId}
        onSave={handleSaveEdit}
        onCancel={resetForm}
      />
    )
  }

  return (
    <DocumentRowView
      document={document}
      displayName={displayName}
      formattedDate={formattedDate}
      categoryLabel={categoryConfig?.label}
      canDownload={layerConfig.canDownload}
      canEdit={canEdit}
      canPromote={layerConfig.canPromote}
      canDelete={canDelete}
      isLoadingUrl={isLoadingUrl}
      isPromoting={isPromoting}
      isDeleting={isDeleting}
      onView={handleView}
      onDownload={handleDownload}
      onEdit={() => setIsEditing(true)}
      onPromote={handlePromote}
      onDelete={handleDelete}
    />
  )
}
