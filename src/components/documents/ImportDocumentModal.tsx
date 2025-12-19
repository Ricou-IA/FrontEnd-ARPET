// ============================================================
// ARPET - ImportDocumentModal Component
// Version: 1.2.0 - Catégories par UUID
// Date: 2025-12-18
// ============================================================

import { useState, useRef, useEffect } from 'react'
import { X, Upload, FileText, Loader2 } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { isEmojiIcon } from '@/types'

interface ImportDocumentModalProps {
  isOpen: boolean
  onClose: () => void
}

// Types de fichiers acceptés
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 Mo

export function ImportDocumentModal({ isOpen, onClose }: ImportDocumentModalProps) {
  const { 
    uploadDocument, 
    documentsLoading,
    availableCategories,
    fetchDocumentCategories 
  } = useAppStore()

  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [categoryId, setCategoryId] = useState<string>('') // UUID
  const [description, setDescription] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Charger les catégories au montage si pas déjà chargées
  useEffect(() => {
    if (isOpen && availableCategories.length === 0) {
      fetchDocumentCategories('user')
    }
  }, [isOpen, availableCategories.length, fetchDocumentCategories])

  // Filtrer les catégories pour la couche 'user'
  const userCategories = availableCategories.filter(cat => 
    cat.target_layers?.includes('user')
  )

  // Reset form quand on ferme
  useEffect(() => {
    if (!isOpen) {
      setFile(null)
      setFileName('')
      setCategoryId('')
      setDescription('')
      setError(null)
    }
  }, [isOpen])

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return 'Type de fichier non supporté. Utilisez PDF, Word, Excel ou images.'
    }
    if (f.size > MAX_FILE_SIZE) {
      return 'Fichier trop volumineux (max 50 Mo)'
    }
    return null
  }

  const handleFileSelect = (f: File) => {
    const validationError = validateFile(f)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setFile(f)
    // Pré-remplir le nom sans l'extension
    const nameWithoutExt = f.name.replace(/\.[^/.]+$/, '')
    setFileName(nameWithoutExt)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleSubmit = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const result = await uploadDocument(
        file, 
        categoryId || undefined, // UUID ou undefined
        description || undefined
      )
      
      if (result) {
        onClose()
      } else {
        setError("Erreur lors de l'import du document")
      }
    } catch (err) {
      setError("Erreur lors de l'import du document")
      console.error('Upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-stone-900 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">
            📤 Importer un document
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Zone de drop */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition
              ${isDragging 
                ? 'border-stone-400 bg-stone-100 dark:bg-stone-800' 
                : 'border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600'
              }
              ${file ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : ''}
            `}
          >
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-10 h-10 text-green-600 dark:text-green-400" />
                <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                  {file.name}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {(file.size / 1024 / 1024).toFixed(2)} Mo
                </p>
                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); setFileName('') }}
                  className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                >
                  Supprimer
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-10 h-10 text-stone-400" />
                <p className="text-sm text-stone-600 dark:text-stone-300">
                  Glissez un fichier ici ou <span className="text-stone-800 dark:text-white font-medium">parcourir</span>
                </p>
                <p className="text-xs text-stone-400 dark:text-stone-500">
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

          {/* Catégorie (par UUID) */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              Catégorie
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600"
            >
              <option value="">— Sélectionner une catégorie —</option>
              {userCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {isEmojiIcon(cat.icon || '') ? `${cat.icon} ` : ''}{cat.label}
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
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 dark:border-stone-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:text-stone-800 dark:hover:text-white transition"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || !fileName.trim() || isUploading || documentsLoading}
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800 rounded-lg hover:bg-black dark:hover:bg-white transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
