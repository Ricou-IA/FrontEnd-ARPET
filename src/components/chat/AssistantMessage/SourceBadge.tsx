// ============================================================
// SourceBadge Component
// Badge pour afficher une source (document ou qa_memory)
// ============================================================

import { useState } from 'react'
import { Eye, Loader2 } from 'lucide-react'
import type { MessageSource, ViewerDocument } from '../../../types'
import { getAuthorityBadge } from '../../../types'
import { getSourceFileById, getFileDownloadUrl } from '../../../services/documents.service'

interface SourceBadgeProps {
  source: MessageSource
  onOpenViewer: (doc: ViewerDocument) => void
}

export function SourceBadge({ source, onOpenViewer }: SourceBadgeProps) {
  const [isLoading, setIsLoading] = useState(false)

  const isQAMemory = source.type === 'qa_memory'
  const authorityBadge = isQAMemory ? getAuthorityBadge(source.authority_label) : null

  const sourceFileId = source.source_file_id
  const isDocument = !isQAMemory && sourceFileId

  const handleViewDocument = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (isLoading || !sourceFileId) return

    console.log('Opening document with source_file_id:', sourceFileId)
    setIsLoading(true)

    try {
      const { data: file, error: fileError } = await getSourceFileById(sourceFileId)

      if (fileError || !file) {
        console.error('Could not find file:', sourceFileId, fileError)
        return
      }

      console.log('Found file:', file.original_filename)

      if (!file.storage_path) {
        console.error('File has no storage path:', file.id)
        return
      }

      const { data: url, error: urlError } = await getFileDownloadUrl(
        file.storage_bucket,
        file.storage_path
      )

      if (urlError || !url) {
        console.error('Could not get signed URL:', urlError)
        return
      }

      const viewerDoc: ViewerDocument = {
        id: file.id,
        filename: file.original_filename,
        url: url,
        mimeType: file.mime_type,
        fileSize: file.file_size,
        initialPage: source.page || undefined,
      }

      onOpenViewer(viewerDoc)
    } catch (err) {
      console.error('Error opening document:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Badge pour qa_memory
  if (isQAMemory) {
    return (
      <span
        className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 cursor-help ${
          authorityBadge?.color || 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
        }`}
        title={source.content_preview || 'Réponse validée'}
      >
        {source.authority_label === 'expert' && '⭐'}
        {source.authority_label === 'team' && '✓'}
        <span className="truncate max-w-[120px]">
          {source.document_name || source.name || 'Mémoire collective'}
        </span>
      </span>
    )
  }

  // Badge pour document
  const displayName = source.document_name || source.name || 'Document'
  const pageLabel = source.page ? ` (p.${source.page})` : ''

  if (isDocument) {
    return (
      <button
        onClick={handleViewDocument}
        disabled={isLoading}
        className="text-[10px] italic bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-2 py-0.5 rounded flex items-center gap-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer disabled:opacity-50"
        title={source.content_preview || 'Cliquer pour ouvrir le document'}
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Eye className="w-3 h-3" />
        )}
        <span className="truncate max-w-[150px]">
          {displayName}{pageLabel}
        </span>
      </button>
    )
  }

  return (
    <span
      className="text-[10px] italic bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-2 py-0.5 rounded flex items-center gap-1.5"
      title={source.content_preview || 'Document source'}
    >
      <span className="truncate max-w-[150px]">
        {displayName}
      </span>
    </span>
  )
}
