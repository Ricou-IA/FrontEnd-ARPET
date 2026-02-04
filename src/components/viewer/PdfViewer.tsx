// ============================================================
// ARPET - PdfViewer Component
// Version: 2.1.0 - Fix scroll saccadé (suppression boucle infinie)
// Date: 2025-12-20
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
  onPageChange?: (page: number) => void
}

export function PdfViewer({
  url,
  filename,
  zoom,
  currentPage,
  onLoadSuccess,
  onLoadError,
  onPageChange
}: PdfViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [numPages, setNumPages] = useState(0)
  const [containerWidth, setContainerWidth] = useState<number | null>(null)
  const [visiblePage, setVisiblePage] = useState(1)

  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Flag pour distinguer scroll programmatique (boutons) vs scroll naturel (molette)
  const isScrollingProgrammatically = useRef(false)
  const lastCurrentPage = useRef(currentPage)

  // Observer le redimensionnement du conteneur
  const updateContainerWidth = useCallback(() => {
    if (containerRef.current) {
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

  /**
   * Scroll direct vers une page par calcul de position.
   * Contourne la virtualisation : positionne le scroll via la hauteur estimée,
   * met à jour visiblePage pour recentrer le buffer de rendu,
   * puis ajuste avec scrollIntoView une fois la page réellement rendue.
   */
  const scrollToPageDirect = useCallback((targetPage: number) => {
    if (!containerRef.current) return

    isScrollingProgrammatically.current = true

    // Calculer la position estimée (hauteur page A4 + gap 16px + padding)
    const pageHeight = containerRef.current.clientWidth
      ? (containerRef.current.clientWidth - 32) * 1.414
      : 800
    const gap = 16 // gap-4 = 16px (Tailwind)
    const paddingTop = 16 // py-4 = 16px
    const estimatedOffset = paddingTop + (targetPage - 1) * (pageHeight + gap)

    // 1. Scroll instantané vers la position estimée (déplace le viewport)
    containerRef.current.scrollTop = estimatedOffset

    // 2. Mettre à jour visiblePage → le buffer de rendu se recentre sur targetPage
    setVisiblePage(targetPage)
    lastCurrentPage.current = targetPage

    // 3. Après le re-rendu (les pages autour de targetPage sont maintenant rendues),
    //    ajuster avec scrollIntoView pour la précision pixel-perfect
    setTimeout(() => {
      const pageElement = pageRefs.current.get(targetPage)
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'auto', block: 'start' })
      }

      setTimeout(() => {
        isScrollingProgrammatically.current = false
      }, 300)
    }, 150)
  }, [])

  // Observer quelle page est visible (pour mettre à jour l'indicateur)
  useEffect(() => {
    if (!containerRef.current || numPages === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Ignorer si on est en scroll programmatique
        if (isScrollingProgrammatically.current) return

        // Trouver la page la plus visible
        let maxRatio = 0
        let mostVisiblePage = visiblePage

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio
            const pageNum = parseInt(entry.target.getAttribute('data-page') || '1', 10)
            mostVisiblePage = pageNum
          }
        })

        if (mostVisiblePage !== visiblePage) {
          setVisiblePage(mostVisiblePage)
          // Mettre à jour le store seulement lors du scroll naturel
          onPageChange?.(mostVisiblePage)
        }
      },
      {
        root: containerRef.current,
        threshold: [0.5], // Simplifié: une seule valeur de seuil
      }
    )

    // Observer toutes les pages
    pageRefs.current.forEach((element) => {
      observer.observe(element)
    })

    return () => observer.disconnect()
  }, [numPages, visiblePage, onPageChange])

  // Scroll vers une page spécifique quand currentPage change depuis l'extérieur
  // (boutons < > de la toolbar, ou setViewerPage depuis le store)
  useEffect(() => {
    // Ne rien faire si c'est le même numéro de page ou si pas encore chargé
    if (currentPage === lastCurrentPage.current || numPages === 0) return

    // Si la page est déjà rendue (dans le buffer), scroll smooth classique
    if (pageRefs.current.has(currentPage)) {
      const pageElement = pageRefs.current.get(currentPage)
      const isRendered = pageElement && pageElement.querySelector('canvas')

      if (isRendered) {
        isScrollingProgrammatically.current = true
        lastCurrentPage.current = currentPage
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setVisiblePage(currentPage)
        setTimeout(() => {
          isScrollingProgrammatically.current = false
        }, 500)
        return
      }
    }

    // Sinon (page hors buffer), utiliser le scroll direct par position
    scrollToPageDirect(currentPage)
  }, [currentPage, numPages, scrollToPageDirect])

  // Reset quand l'URL change
  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
    setNumPages(0)
    setVisiblePage(1)
    // Ne pas forcer lastCurrentPage à 1 — le store peut déjà avoir initialPage > 1.
    // On le reset à 0 pour que le useEffect de scroll détecte le changement au prochain rendu.
    lastCurrentPage.current = 0
    pageRefs.current.clear()
  }, [url])

  const handleLoadSuccess = ({ numPages: loadedNumPages }: { numPages: number }) => {
    setNumPages(loadedNumPages)
    setIsLoading(false)
    setHasError(false)
    onLoadSuccess(loadedNumPages)

    // Navigation initiale vers la page demandée si > 1 (ex: ouverture via citation)
    if (currentPage > 1 && currentPage <= loadedNumPages) {
      scrollToPageDirect(currentPage)
    }
  }

  const handleLoadError = (error: Error) => {
    console.error('PDF load error:', error)
    setIsLoading(false)
    setHasError(true)
    onLoadError(error)
  }

  // Référence pour chaque page
  const setPageRef = useCallback((pageNum: number, element: HTMLDivElement | null) => {
    if (element) {
      pageRefs.current.set(pageNum, element)
    } else {
      pageRefs.current.delete(pageNum)
    }
  }, [])

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-stone-400 dark:text-stone-500">
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

      <Document
        file={url}
        onLoadSuccess={handleLoadSuccess}
        onLoadError={handleLoadError}
        loading={null}
        className="flex flex-col items-center py-4 gap-4"
      >
        {/* Virtualization simple: Rendu conditionnel des pages proches */}
        {Array.from({ length: numPages }, (_, index) => {
          const pageNumber = index + 1
          // Marge de sécurité (buffer) pour le rendu
          const buffer = 3
          const isVisible = Math.abs(pageNumber - visiblePage) <= buffer

          // Estimation de la hauteur pour le placeholder (A4 ratio approx 1.414)
          const placeholderHeight = effectiveWidth ? effectiveWidth * 1.414 : 800

          return (
            <div
              key={pageNumber}
              ref={(el) => setPageRef(pageNumber, el)}
              data-page={pageNumber}
              className="flex-shrink-0"
              style={{
                minHeight: isVisible ? undefined : placeholderHeight,
                width: effectiveWidth
              }}
            >
              {isVisible ? (
                <Page
                  pageNumber={pageNumber}
                  width={effectiveWidth}
                  loading={
                    <div
                      className="flex items-center justify-center bg-white"
                      style={{ width: effectiveWidth, height: placeholderHeight }}
                    >
                      <Loader2 className="w-6 h-6 text-stone-300 animate-spin" />
                    </div>
                  }
                  className="shadow-lg"
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              ) : (
                <div
                  className="bg-white/50 border border-stone-200 dark:border-stone-700 flex items-center justify-center"
                  style={{ width: effectiveWidth, height: placeholderHeight }}
                >
                  <span className="text-xs text-stone-400">Page {pageNumber}</span>
                </div>
              )}
            </div>
          )
        })}
      </Document>

      {/* Indicateur de page flottant */}
      {!isLoading && numPages > 0 && (
        <div className="sticky bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
            Page {visiblePage} sur {numPages}
          </div>
        </div>
      )}
    </div>
  )
}
