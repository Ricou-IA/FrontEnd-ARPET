// ============================================================
// ARPET - DocumentRow Edit Mode
// ============================================================

import { Loader2, Check, X } from 'lucide-react'
import type { Project } from '@/types'

interface DocumentCategory {
  id: string
  label: string
}

interface DocumentRowEditProps {
  editFilename: string
  editProjectId: string | null
  editCategoryId: string
  isSaving: boolean
  userProjects: Project[]
  availableCategories: DocumentCategory[]
  onFilenameChange: (value: string) => void
  onProjectChange: (value: string | null) => void
  onCategoryChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export function DocumentRowEdit({
  editFilename,
  editProjectId,
  editCategoryId,
  isSaving,
  userProjects,
  availableCategories,
  onFilenameChange,
  onProjectChange,
  onCategoryChange,
  onSave,
  onCancel,
}: DocumentRowEditProps) {
  return (
    <tr className="bg-gray-50">
      <td className="py-3 px-2">
        <input
          type="text"
          value={editFilename}
          onChange={(e) => onFilenameChange(e.target.value)}
          className="w-full px-2 py-1.5 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-300 text-[#0B0F17]"
        />
      </td>
      <td className="py-3 px-2">
        <select
          value={editProjectId || ''}
          onChange={(e) => onProjectChange(e.target.value || null)}
          className="w-full px-1 py-1.5 text-xs bg-white border border-gray-300 rounded text-[#0B0F17]"
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
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full px-1 py-1.5 text-xs bg-white border border-gray-300 rounded text-[#0B0F17]"
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
            onClick={onSave}
            disabled={isSaving}
            className="p-1.5 text-[#0B0F17] hover:bg-gray-100 rounded"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}
