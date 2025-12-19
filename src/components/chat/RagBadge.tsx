// ============================================================
// ARPET - RagBadge Component
// Version: 1.0.0 - Quick Win: Affichage mode RAG + Cache status
// Date: 2025-12-17
// ============================================================

import { Sparkles, Database, Zap } from 'lucide-react'

export type GenerationMode = 'chunks' | 'gemini' | 'hybrid' | undefined
export type CacheStatus = 'hit' | 'miss' | 'none' | undefined

interface RagBadgeProps {
  generationMode?: GenerationMode
  cacheStatus?: CacheStatus
  processingTimeMs?: number
  documentsFound?: number
  className?: string
}

export function RagBadge({ 
  generationMode, 
  cacheStatus, 
  processingTimeMs,
  documentsFound,
  className = '' 
}: RagBadgeProps) {
  // Ne rien afficher si pas d'info
  if (!generationMode) return null

  const isGemini = generationMode === 'gemini'

  // Couleurs selon le mode
  const modeStyles = {
    gemini: {
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      text: 'text-violet-700',
      icon: <Sparkles className="w-3 h-3" />,
      label: 'Gemini'
    },
    chunks: {
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      text: 'text-sky-700',
      icon: <Database className="w-3 h-3" />,
      label: 'RAG Chunks'
    },
    hybrid: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      icon: <Zap className="w-3 h-3" />,
      label: 'Hybride'
    }
  }

  const style = modeStyles[generationMode] || modeStyles.chunks

  // Cache status badge
  const renderCacheStatus = () => {
    if (!isGemini || !cacheStatus || cacheStatus === 'none') return null

    const isHit = cacheStatus === 'hit'
    
    return (
      <span 
        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
          isHit 
            ? 'bg-green-100 text-green-700' 
            : 'bg-orange-100 text-orange-700'
        }`}
        title={isHit ? 'Cache Google utilisé (économie -75%)' : 'Nouveau cache créé'}
      >
        {isHit ? 'Cache ✓' : 'New'}
      </span>
    )
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {/* Badge Mode */}
      <span 
        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${style.bg} ${style.border} ${style.text}`}
        title={`Mode de génération: ${style.label}`}
      >
        {style.icon}
        {style.label}
      </span>

      {/* Cache Status (Gemini only) */}
      {renderCacheStatus()}

      {/* Documents count */}
      {documentsFound !== undefined && documentsFound > 0 && (
        <span className="text-[10px] text-stone-400">
          {documentsFound} doc{documentsFound > 1 ? 's' : ''}
        </span>
      )}

      {/* Processing time */}
      {processingTimeMs !== undefined && processingTimeMs > 0 && (
        <span className="text-[10px] text-stone-400">
          {processingTimeMs < 1000 
            ? `${processingTimeMs}ms` 
            : `${(processingTimeMs / 1000).toFixed(1)}s`
          }
        </span>
      )}
    </div>
  )
}

export default RagBadge
