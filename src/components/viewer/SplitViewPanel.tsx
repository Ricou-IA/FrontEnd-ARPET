// ============================================================
// ARPET - SplitViewPanel Component
// Version: 2.0.0 - Support scroll continu PDF (toutes les pages)
// Date: 2025-12-20
// ============================================================

import { useEffect, useCallback, useMemo } from 'react'
import { FileQuestion } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { getViewerType } from '@/types'
import { ViewerToolbar } from './ViewerToolbar'
import { PdfViewer } from './PdfViewer'
import { ImageViewer } from './ImageViewer'

// Constantes
const ZOOM_STEP = 0.25
const ZOOM_MIN = 0.5
const ZOOM_MAX = 2
const VIEWER_WIDTH = '550px'

// Utilitaires
const downloadFile = (url: string, filename: string) => {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

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

  // Déterminer le type de fichier (memoized)
  const viewerType = useMemo(() => {
    if (!viewerDocument) return 'unsupported'
    return getViewerType(viewerDocument.mimeType, viewerDocument.filename)
  }, [viewerDocument])

  const isPdf = viewerType === 'pdf'
  const isImage = viewerType === 'image'

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

  // Handlers navigation (pour scroll vers une page via toolbar)
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

  // Handler pour mise à jour de la page visible (depuis PdfViewer)
  const handlePageChange = useCallback((page: number) => {
    setViewerPage(page)
  }, [setViewerPage])

  // Handlers zoom (factorisés)
  const handleZoomChange = useCallback((delta: number) => {
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, viewerZoom + delta))
    setViewerZoom(newZoom)
  }, [viewerZoom, setViewerZoom])

  const handleZoomIn = useCallback(() => handleZoomChange(ZOOM_STEP), [handleZoomChange])
  const handleZoomOut = useCallback(() => handleZoomChange(-ZOOM_STEP), [handleZoomChange])

  // Handler téléchargement
  const handleDownload = useCallback(() => {
    if (viewerDocument?.url) {
      downloadFile(viewerDocument.url, viewerDocument.filename)
    }
  }, [viewerDocument])

  // Handlers chargement PDF
  const handlePdfLoadSuccess = useCallback((numPages: number) => {
    setViewerTotalPages(numPages)
    setViewerLoading(false)
  }, [setViewerTotalPages, setViewerLoading])

  const handlePdfLoadError = useCallback(() => {
    setViewerLoading(false)
  }, [setViewerLoading])

  // Rendu du contenu du viewer
  const renderViewerContent = () => {
    if (!viewerDocument) return null

    if (isPdf) {
      return (
        <PdfViewer
          url={viewerDocument.url}
          filename={viewerDocument.filename}
          zoom={viewerZoom}
          currentPage={viewerCurrentPage}
          onLoadSuccess={handlePdfLoadSuccess}
          onLoadError={handlePdfLoadError}
          onPageChange={handlePageChange}
        />
      )
    }

    if (isImage) {
      return (
        <ImageViewer
          url={viewerDocument.url}
          filename={viewerDocument.filename}
          zoom={viewerZoom}
        />
      )
    }

    return (
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
    )
  }

  // Ne pas afficher si fermé
  if (!viewerOpen || !viewerDocument) {
    return null
  }

  return (
    <div 
      className="h-full flex flex-col bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-700 shadow-xl"
      style={{ width: VIEWER_WIDTH, minWidth: VIEWER_WIDTH, maxWidth: VIEWER_WIDTH }}
    >
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

      {/* 
        Conteneur du viewer
        - min-h-0 : permet au flex item de shrink (essentiel pour le scroll)
        - Le PdfViewer gère son propre scroll avec overflow-auto
      */}
      <div className="flex-1 min-h-0">
        {renderViewerContent()}
      </div>
    </div>
  )
}
