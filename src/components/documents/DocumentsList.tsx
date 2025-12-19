// ============================================================
// ARPET - DocumentsList Component
// Version: 2.4.0 - Style Premium avec Empty State corrigé
// Date: 2025-12-18
// ============================================================

import { Loader2, FolderOpen, Upload } from 'lucide-react'
import { DocumentRow } from './DocumentRow'
import type { SourceFile } from '@/types'

interface DocumentsListProps {
  documents: SourceFile[]
  loading: boolean
  emptyMessage?: string
  onImportClick?: () => void
}

export function DocumentsList({ 
  documents, 
  loading, 
  emptyMessage = 'Aucun document',
  onImportClick
}: DocumentsListProps) {

  return (
    <div className="w-full h-full px-6 py-6">
      {/* Table TOUJOURS présente pour maintenir la structure */}
      <table className="w-full table-fixed">
        <colgroup>
          <col style={{ width: '50px' }} />
          <col /> {/* Nom prend le reste */}
          <col style={{ width: '110px' }} />
          <col style={{ width: '160px' }} />
          <col style={{ width: '110px' }} />
        </colgroup>

        {/* Header TOUJOURS visible - SANS bordure */}
        <thead>
          <tr>
            <th className="py-4 text-left text-xs font-sans font-medium text-gray-400 uppercase tracking-wider">
              Type
            </th>
            <th className="py-4 px-2 text-left text-xs font-sans font-medium text-gray-400 uppercase tracking-wider">
              Nom
            </th>
            <th className="py-4 px-2 text-left text-xs font-sans font-medium text-gray-400 uppercase tracking-wider">
              Date
            </th>
            <th className="py-4 px-2 text-left text-xs font-sans font-medium text-gray-400 uppercase tracking-wider">
              Catégorie
            </th>
            <th className="py-4 text-right text-xs font-sans font-medium text-gray-400 uppercase tracking-wider">
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
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              </td>
            </tr>
          ) : documents.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-16">
                <div className="flex flex-col items-center justify-center">
                  {/* Zone délimitée - Fond pur, bordure pointillée fine */}
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 w-full max-w-md bg-gray-50/30">
                    <div className="flex flex-col items-center justify-center">
                      {/* Icône avec cercle gris */}
                      <div className="bg-gray-50 rounded-full p-6 mb-6">
                        <FolderOpen className="w-16 h-16 text-slate-400" strokeWidth={1} />
                      </div>
                      
                      {/* Message */}
                      <p className="text-sm text-slate-400 mb-6 text-center">{emptyMessage}</p>
                      
                      {/* Bouton d'action */}
                      {onImportClick && (
                        <button
                          onClick={onImportClick}
                          className="px-6 py-2.5 bg-[#0B0F17] text-white rounded-lg hover:bg-[#0B0F17]/90 transition text-sm font-medium flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Importer un fichier
                        </button>
                      )}
                    </div>
                  </div>
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
        <div className="pt-6 text-xs text-gray-400 text-right">
          {documents.length} document{documents.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
