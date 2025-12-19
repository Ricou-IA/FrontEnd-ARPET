// ============================================================
// ARPET - PdfViewer Component
// Version: 1.2.0 - Responsive width adaptation
// Date: 2025-12-19
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Loader2, FileWarning } from 'lucide-react'

// Configuration du worker PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfViewerProps {
  url: string
  filename: string
  zoom: number
  currentPage: number
  onLoadSuccess: (numPages: number) => void
  onLoadError: (error: Error) => void
}

export function PdfViewer({
  url,
  filename,
  zoom,
  currentPage,
  onLoadSuccess,
  onLoadError
}: PdfViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [numPages, setNumPages] = useState(0)
  const [containerWidth, setContainerWidth] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Observer le redimensionnement du conteneur
  const updateContainerWidth = useCallback(() => {
    if (containerRef.current) {
      // Laisser un padding de 32px (16px de chaque côté)
      const width = containerRef.current.clientWidth - 32
      setContainerWidth(width > 0 ? width : null)
    }
  }, [])

  useEffect(() => {
    updateContainerWidth()

    const resizeObserver = new ResizeObserver(() => {
      updateContainerWidth()
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [updateContainerWidth])

  // Reset quand l'URL change
  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
    setNumPages(0)
  }, [url])

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
    setHasError(false)
    onLoadSuccess(numPages)
  }

  const handleLoadError = (error: Error) => {
    console.error('PDF load error:', error)
    setIsLoading(false)
    setHasError(true)
    onLoadError(error)
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-stone-400 dark:text-stone-500">
        <FileWarning className="w-12 h-12 mb-3" />
        <p className="text-sm">Impossible de charger le PDF</p>
        <p className="text-xs mt-1">{filename}</p>
      </div>
    )
  }

  // Calculer la largeur effective avec le zoom
  const effectiveWidth = containerWidth ? Math.round(containerWidth * zoom) : undefined

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-auto bg-stone-200 dark:bg-stone-900"
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100 dark:bg-stone-800 z-10">
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-stone-400 animate-spin mb-2" />
            <p className="text-sm text-stone-500">Chargement du PDF...</p>
          </div>
        </div>
      )}

      <div className="flex justify-center p-4">
        <Document
          file={url}
          onLoadSuccess={handleLoadSuccess}
          onLoadError={handleLoadError}
          loading={null}
          className="flex flex-col items-center"
        >
          <Page
            pageNumber={currentPage}
            width={effectiveWidth}
            loading={null}
            className="shadow-lg"
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {/* Indicateur de page en bas */}
      {!isLoading && numPages > 0 && (
        <div className="sticky bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
            Page {currentPage} sur {numPages}
          </div>
        </div>
      )}
    </div>
  )
}
