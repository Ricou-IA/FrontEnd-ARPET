// ============================================================
// ARPET - DocumentRow View Mode
// ============================================================

import { ProcessingIcon } from './ProcessingIcon'
import { DocumentRowActions } from './DocumentRowActions'
import { formatFileSize, getPromotionBadge, type SourceFile } from '@/types'

interface DocumentRowViewProps {
  document: SourceFile
  displayName: string
  formattedDate: string
  categoryLabel?: string | null
  canDownload: boolean
  canEdit: boolean
  canPromote: boolean
  canDelete: boolean
  isLoadingUrl: boolean
  isPromoting: boolean
  isDeleting: boolean
  onView: () => void
  onDownload: () => void
  onEdit: () => void
  onPromote: () => void
  onDelete: () => void
}

export function DocumentRowView({
  document,
  displayName,
  formattedDate,
  categoryLabel,
  canDownload,
  canEdit,
  canPromote,
  canDelete,
  isLoadingUrl,
  isPromoting,
  isDeleting,
  onView,
  onDownload,
  onEdit,
  onPromote,
  onDelete,
}: DocumentRowViewProps) {
  const promotionBadge = getPromotionBadge(document.promotion_status)

  return (
    <tr className="hover:bg-gray-50 transition group">
      <td className="py-3 px-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-[#0B0F17] truncate">
            {displayName}
          </span>
          <ProcessingIcon
            status={document.processing_status}
            error={document.processing_error}
          />
          {promotionBadge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0 bg-gray-100 text-gray-700 border border-gray-200">
              {promotionBadge.label}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          {formatFileSize(document.file_size)}
          {document.chunk_count > 0 && ` \u2022 ${document.chunk_count} chunks`}
        </div>
      </td>

      <td className="py-3 px-2 text-xs text-gray-500 whitespace-nowrap">
        {formattedDate}
      </td>

      <td className="py-3 px-2">
        {categoryLabel ? (
          <div className="flex items-center gap-1 text-xs text-gray-500" title={categoryLabel}>
            <span className="truncate">{categoryLabel}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">&mdash;</span>
        )}
      </td>

      <td className="py-3 text-right">
        <DocumentRowActions
          canDownload={canDownload}
          canEdit={canEdit}
          canPromote={canPromote}
          canDelete={canDelete}
          isDraft={document.promotion_status === 'draft'}
          isLoadingUrl={isLoadingUrl}
          isPromoting={isPromoting}
          isDeleting={isDeleting}
          hasStoragePath={!!document.storage_path}
          onView={onView}
          onDownload={onDownload}
          onEdit={onEdit}
          onPromote={onPromote}
          onDelete={onDelete}
        />
      </td>
    </tr>
  )
}
