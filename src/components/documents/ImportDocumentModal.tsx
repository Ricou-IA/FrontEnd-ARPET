// ============================================================
// ARPET - ImportDocumentModal Component
// Version: 1.0.0 - Modale d'import de document (drag & drop)
// Date: 2025-12-18
// ============================================================

import { useState, useRef, useCallback } from 'react'
import { X, Upload, FileText, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { CATEGORY_CONFIG, type DocumentCategory } from '@/types'

interface ImportDocumentModalProps {
  isOpen: boolean
  onClose: () => void
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
  'text/csv'
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 Mo

const CATEGORIES = Object.entries(CATEGORY_CONFIG) as [DocumentCategory, typeof CATEGORY_CONFIG[DocumentCategory]][]

export function ImportDocumentModal({ isOpen, onClose }: ImportDocumentModalProps) {
  const { uploadDocument } = useAppStore()

  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [category, setCategory] = useState<DocumentCategory>('Autre')
  const [description, setDescription] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset state
  const resetState = useCallback(() => {
    setFile(null)
    setFileName('')
    setCategory('Autre')
    setDescription('')
    setError(null)
    setUploadSuccess(false)
  }, [])

  // Fermer la modale
  const handleClose = () => {
    if (isUploading) return
    resetState()
    onClose()
  }

  // Valider le fichier
  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return 'Type de fichier non supporté. Formats acceptés : PDF, Word, Excel, Images'
    }
    if (f.size > MAX_FILE_SIZE) {
      return 'Fichier trop volumineux. Taille maximale : 50 Mo'
    }
    return null
  }

  // Sélectionner un fichier
  const handleFileSelect = (f: File) => {
    const validationError = validateFile(f)
    if (validationError) {
      setError(validationError)
      return
    }

    setFile(f)
    setFileName(f.name.replace(/\.[^/.]+$/, '')) // Nom sans extension
    setError(null)
  }

  // Input file change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFileSelect(f)
  }

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const f = e.dataTransfer.files?.[0]
    if (f) handleFileSelect(f)
  }

  // Upload
  const handleUpload = async () => {
    if (!file || isUploading) return

    setIsUploading(true)
    setError(null)

    try {
      const result = await uploadDocument(file, category, description || undefined)
      
      if (result) {
        setUploadSuccess(true)
        setTimeout(() => {
          handleClose()
        }, 1500)
      } else {
        setError('Erreur lors de l\'upload. Veuillez réessayer.')
      }
    } catch (err) {
      setError('Erreur inattendue. Veuillez réessayer.')
      console.error('Upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importer un document
          </h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-5">
          {/* Zone Drag & Drop */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${isDragging 
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                : file
                  ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                  : 'border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800/50'
              }
            `}
          >
            {file ? (
              <div className="flex flex-col items-center">
                <FileText className="w-12 h-12 text-green-500 mb-3" />
                <p className="text-sm font-medium text-stone-700 dark:text-stone-200 truncate max-w-full">
                  {file.name}
                </p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} Mo
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    setFileName('')
                  }}
                  className="mt-3 text-xs text-red-500 hover:text-red-600 underline"
                >
                  Changer de fichier
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-12 h-12 text-stone-400 dark:text-stone-500 mb-3" />
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  <span className="font-medium">Glissez votre fichier ici</span>
                  <br />
                  ou cliquez pour parcourir
                </p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">
                  PDF, Word, Excel, Images • Max 50 Mo
                </p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleInputChange}
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
          />

          {/* Nom du document */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              Nom du document
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Ex: CCTP Lot Gros Œuvre"
              className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600"
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              Catégorie
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600"
            >
              {CATEGORIES.map(([key, config]) => (
                <option key={key} value={key}>
                  {config.icon} {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description (optionnel) */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              Description <span className="text-stone-400 font-normal">(optionnel)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ajoutez une description..."
              rows={2}
              className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600 resize-none"
            />
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
            <span className="text-blue-500">💡</span>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Ce document sera visible <strong>uniquement par vous</strong>. 
              Vous pourrez le proposer à l'équipe ensuite.
            </p>
          </div>

          {/* Erreur */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Succès */}
          {uploadSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <p className="text-xs text-green-600 dark:text-green-400">Document importé avec succès !</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading || uploadSuccess}
            className="flex items-center gap-2 px-5 py-2 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800 rounded-lg hover:bg-black dark:hover:bg-white transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Import en cours...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
