// ============================================================
// ARPET - DocumentRow Action Buttons
// ============================================================

import { Eye, Download, Upload, Trash2, Loader2, Pencil } from 'lucide-react'

interface DocumentRowActionsProps {
  canDownload: boolean
  canEdit: boolean
  canPromote: boolean
  canDelete: boolean
  isDraft: boolean
  isLoadingUrl: boolean
  isPromoting: boolean
  isDeleting: boolean
  hasStoragePath: boolean
  onView: () => void
  onDownload: () => void
  onEdit: () => void
  onPromote: () => void
  onDelete: () => void
}

export function DocumentRowActions({
  canDownload,
  canEdit,
  canPromote,
  canDelete,
  isDraft,
  isLoadingUrl,
  isPromoting,
  isDeleting,
  hasStoragePath,
  onView,
  onDownload,
  onEdit,
  onPromote,
  onDelete,
}: DocumentRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Bouton Voir */}
      <button
        onClick={onView}
        disabled={isLoadingUrl || !hasStoragePath}
        className="p-1.5 text-gray-500 hover:text-[#0B0F17] hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
        title="Voir"
      >
        {isLoadingUrl ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </button>

      {canDownload && (
        <button
          onClick={onDownload}
          disabled={!hasStoragePath}
          className="p-1.5 text-gray-500 hover:text-[#0B0F17] hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
          title="Télécharger"
        >
          <Download className="w-4 h-4" />
        </button>
      )}

      {canEdit && (
        <button
          onClick={onEdit}
          className="p-1.5 text-gray-500 hover:text-[#0B0F17] hover:bg-gray-100 rounded"
          title="Modifier"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}

      {canPromote && isDraft && (
        <button
          onClick={onPromote}
          disabled={isPromoting}
          className="p-1.5 text-gray-500 hover:text-[#0B0F17] hover:bg-gray-100 rounded"
          title="Proposer"
        >
          {isPromoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        </button>
      )}

      {canDelete && (
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="p-1.5 text-gray-500 hover:text-[#0B0F17] hover:bg-gray-100 rounded"
          title="Supprimer"
        >
          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      )}
    </div>
  )
}
