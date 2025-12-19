// ============================================================
// ARPET - ViewerToolbar Component
// Version: 1.0.0
// Date: 2025-12-18
// ============================================================

import { 
    ChevronLeft, 
    ChevronRight, 
    ZoomIn, 
    ZoomOut, 
    Download, 
    X,
    Loader2
  } from 'lucide-react'
  
  interface ViewerToolbarProps {
    filename: string
    currentPage: number
    totalPages: number
    zoom: number
    isPdf: boolean
    isLoading: boolean
    onPrevPage: () => void
    onNextPage: () => void
    onZoomIn: () => void
    onZoomOut: () => void
    onDownload: () => void
    onClose: () => void
  }
  
  export function ViewerToolbar({
    filename,
    currentPage,
    totalPages,
    zoom,
    isPdf,
    isLoading,
    onPrevPage,
    onNextPage,
    onZoomIn,
    onZoomOut,
    onDownload,
    onClose,
  }: ViewerToolbarProps) {
    const zoomPercent = Math.round(zoom * 100)
  
    return (
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50">
        {/* Nom du fichier */}
        <div className="flex-1 min-w-0 mr-4">
          <h3 className="text-sm font-medium text-stone-700 dark:text-stone-200 truncate">
            {filename}
          </h3>
        </div>
  
        {/* Contrôles centraux */}
        <div className="flex items-center gap-1">
          {/* Navigation pages (PDF uniquement) */}
          {isPdf && (
            <>
              <button
                onClick={onPrevPage}
                disabled={currentPage <= 1 || isLoading}
                className="p-1.5 rounded-md text-stone-500 hover:text-stone-700 hover:bg-stone-200 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Page précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="px-2 text-xs text-stone-600 dark:text-stone-300 min-w-[60px] text-center">
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin inline" />
                ) : (
                  `${currentPage} / ${totalPages}`
                )}
              </span>
              
              <button
                onClick={onNextPage}
                disabled={currentPage >= totalPages || isLoading}
                className="p-1.5 rounded-md text-stone-500 hover:text-stone-700 hover:bg-stone-200 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Page suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
  
              <div className="w-px h-5 bg-stone-300 dark:bg-stone-600 mx-2" />
            </>
          )}
  
          {/* Zoom */}
          <button
            onClick={onZoomOut}
            disabled={zoom <= 0.5 || isLoading}
            className="p-1.5 rounded-md text-stone-500 hover:text-stone-700 hover:bg-stone-200 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Zoom arrière"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <span className="px-2 text-xs text-stone-600 dark:text-stone-300 min-w-[45px] text-center">
            {zoomPercent}%
          </span>
          
          <button
            onClick={onZoomIn}
            disabled={zoom >= 2 || isLoading}
            className="p-1.5 rounded-md text-stone-500 hover:text-stone-700 hover:bg-stone-200 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Zoom avant"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
  
          <div className="w-px h-5 bg-stone-300 dark:bg-stone-600 mx-2" />
  
          {/* Télécharger */}
          <button
            onClick={onDownload}
            disabled={isLoading}
            className="p-1.5 rounded-md text-stone-500 hover:text-stone-700 hover:bg-stone-200 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Télécharger"
          >
            <Download className="w-4 h-4" />
          </button>
  
          {/* Fermer */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-stone-500 hover:text-red-600 hover:bg-red-50 dark:text-stone-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors ml-1"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }
  