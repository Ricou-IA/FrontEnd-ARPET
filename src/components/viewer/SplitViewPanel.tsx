// ============================================================
// ARPET - SplitViewPanel Component
// Version: 1.0.0
// Date: 2025-12-18
// ============================================================

import { useEffect, useCallback } from 'react'
import { FileQuestion } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { ViewerToolbar } from './ViewerToolbar'
import { PdfViewer } from './PdfViewer'
import { ImageViewer } from './ImageViewer'

export function SplitViewPanel() {
  const { 
    viewerOpen, 
    viewerDocument,
    viewerCurrentPage,
    viewerTotalPages,
    viewerZoom,
    viewerLoading,
    closeViewer,
    setViewerPage,
    setViewerTotalPages,
    setViewerZoom,
    setViewerLoading,
  } = useAppStore()

  // Fermer avec Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewerOpen) {
        closeViewer()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewerOpen, closeViewer])

  // Handlers navigation
  const handlePrevPage = useCallback(() => {
    if (viewerCurrentPage > 1) {
      setViewerPage(viewerCurrentPage - 1)
    }
  }, [viewerCurrentPage, setViewerPage])

  const handleNextPage = useCallback(() => {
    if (viewerCurrentPage < viewerTotalPages) {
      setViewerPage(viewerCurrentPage + 1)
    }
  }, [viewerCurrentPage, viewerTotalPages, setViewerPage])

  // Handlers zoom
  const handleZoomIn = useCallback(() => {
    if (viewerZoom < 2) {
      setViewerZoom(Math.min(2, viewerZoom + 0.25))
    }
  }, [viewerZoom, setViewerZoom])

  const handleZoomOut = useCallback(() => {
    if (viewerZoom > 0.5) {
      setViewerZoom(Math.max(0.5, viewerZoom - 0.25))
    }
  }, [viewerZoom, setViewerZoom])

  // Handler téléchargement
  const handleDownload = useCallback(() => {
    if (viewerDocument?.url) {
      const link = document.createElement('a')
      link.href = viewerDocument.url
      link.download = viewerDocument.filename
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }, [viewerDocument])

  // Handler chargement PDF réussi
  const handlePdfLoadSuccess = useCallback((numPages: number) => {
    setViewerTotalPages(numPages)
    setViewerLoading(false)
  }, [setViewerTotalPages, setViewerLoading])

  // Handler erreur chargement PDF
  const handlePdfLoadError = useCallback(() => {
    setViewerLoading(false)
  }, [setViewerLoading])

  // Ne pas afficher si fermé
  if (!viewerOpen || !viewerDocument) {
    return null
  }

  // Déterminer le type de fichier
  const isPdf = viewerDocument.mimeType?.includes('pdf') || 
                viewerDocument.filename.toLowerCase().endsWith('.pdf')
  const isImage = viewerDocument.mimeType?.startsWith('image/') ||
                  /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(viewerDocument.filename)
  const isSupported = isPdf || isImage

  return (
    <div 
      className="h-full flex flex-col bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-700 md:border-l shadow-xl w-full md:w-[45%] md:min-w-[400px] md:max-w-[700px]"
    >
      {/* Toolbar */}
      <ViewerToolbar
        filename={viewerDocument.filename}
        currentPage={viewerCurrentPage}
        totalPages={viewerTotalPages}
        zoom={viewerZoom}
        isPdf={isPdf}
        isLoading={viewerLoading}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onDownload={handleDownload}
        onClose={closeViewer}
      />

      {/* Contenu */}
      <div className="flex-1 overflow-hidden">
        {isPdf && (
          <PdfViewer
            url={viewerDocument.url}
            filename={viewerDocument.filename}
            zoom={viewerZoom}
            currentPage={viewerCurrentPage}
            onLoadSuccess={handlePdfLoadSuccess}
            onLoadError={handlePdfLoadError}
          />
        )}

        {isImage && (
          <ImageViewer
            url={viewerDocument.url}
            filename={viewerDocument.filename}
            zoom={viewerZoom}
          />
        )}

        {!isSupported && (
          <div className="flex flex-col items-center justify-center h-full text-stone-400 dark:text-stone-500">
            <FileQuestion className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">Format non supporté</p>
            <p className="text-xs mt-1 mb-4">{viewerDocument.filename}</p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-sm bg-stone-800 text-white rounded-lg hover:bg-stone-700 dark:bg-stone-200 dark:text-stone-800 dark:hover:bg-stone-300 transition-colors"
            >
              Télécharger le fichier
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

