// ============================================================
// ARPET - DocumentsList Component
// Version: 2.0.0 - Table HTML full width
// Date: 2025-12-18
// ============================================================

import { Loader2 } from 'lucide-react'
import { DocumentRow } from './DocumentRow'
import type { SourceFile } from '@/types'

interface DocumentsListProps {
  documents: SourceFile[]
  loading: boolean
  emptyMessage?: string
}

export function DocumentsList({ 
  documents, 
  loading, 
  emptyMessage = 'Aucun document' 
}: DocumentsListProps) {

  return (
    <div className="w-full h-full px-6 py-4">
      {/* Table TOUJOURS présente pour maintenir la structure */}
      <table className="w-full table-fixed">
        <colgroup>
          <col style={{ width: '50px' }} />
          <col /> {/* Nom prend le reste */}
          <col style={{ width: '110px' }} />
          <col style={{ width: '160px' }} />
          <col style={{ width: '110px' }} />
        </colgroup>

        {/* Header TOUJOURS visible */}
        <thead>
          <tr className="border-b border-stone-100 dark:border-stone-800">
            <th className="py-2 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Type
            </th>
            <th className="py-2 px-2 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Nom
            </th>
            <th className="py-2 px-2 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Date
            </th>
            <th className="py-2 px-2 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Catégorie
            </th>
            <th className="py-2 text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="py-12">
                <div className="flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
                </div>
              </td>
            </tr>
          ) : documents.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-12">
                <div className="flex flex-col items-center justify-center text-stone-400 dark:text-stone-500">
                  <span className="text-4xl mb-2">📂</span>
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            documents.map(doc => (
              <DocumentRow key={doc.id} document={doc} />
            ))
          )}
        </tbody>
      </table>

      {/* Footer count */}
      {!loading && documents.length > 0 && (
        <div className="pt-4 text-xs text-stone-400 dark:text-stone-500 text-right">
          {documents.length} document{documents.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
