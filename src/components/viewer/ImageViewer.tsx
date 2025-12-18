// ============================================================
// ARPET - ImageViewer Component
// Version: 1.0.0
// Date: 2025-12-18
// ============================================================

import { useState } from 'react'
import { Loader2, ImageOff } from 'lucide-react'

interface ImageViewerProps {
  url: string
  filename: string
  zoom: number
}

export function ImageViewer({ url, filename, zoom }: ImageViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-stone-400 dark:text-stone-500">
        <ImageOff className="w-12 h-12 mb-3" />
        <p className="text-sm">Impossible de charger l'image</p>
        <p className="text-xs mt-1">{filename}</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full overflow-auto">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100 dark:bg-stone-800">
          <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
        </div>
      )}
      
      <div 
        className="min-h-full flex items-center justify-center p-4"
        style={{ 
          minWidth: zoom > 1 ? `${zoom * 100}%` : '100%',
        }}
      >
        <img
          src={url}
          alt={filename}
          onLoad={handleLoad}
          onError={handleError}
          className="max-w-none transition-transform duration-200"
          style={{ 
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        />
      </div>
    </div>
  )
}
