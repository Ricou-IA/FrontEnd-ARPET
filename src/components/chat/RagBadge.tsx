// ============================================================
// ARPET - RagBadge Component
// Version: 3.0.0 - Phase 6 : Support mode 'memory'
// Date: 2024-12-31
// ============================================================

import { Database, Zap, FileText, Brain } from 'lucide-react'

export type GenerationMode = 'chunks' | 'gemini' | 'hybrid' | 'memory' | undefined
export type CacheStatus = 'hit' | 'miss' | 'none' | undefined

interface RagBadgeProps {
  generationMode?: GenerationMode
  generationModeUi?: string  // "Full Document", "RAG Chunks", "Mémoire Collective"
  cacheStatus?: CacheStatus
  processingTimeMs?: number
  documentsFound?: number
  className?: string
}

export function RagBadge({ 
  generationMode, 
  generationModeUi,
  cacheStatus, 
  processingTimeMs,
  documentsFound,
  className = '' 
}: RagBadgeProps) {
  // Ne rien afficher si pas d'info
  if (!generationMode && !generationModeUi) return null

  const isGemini = generationMode === 'gemini'
  const isMemory = generationMode === 'memory' || generationModeUi === 'Mémoire Collective'
  const isFullDocument = generationModeUi === 'Full Document' || isGemini

  // Styles selon le mode
  const modeStyles = {
    fullDocument: {
      bg: 'bg-violet-50 dark:bg-violet-900/30',
      border: 'border-violet-200 dark:border-violet-800',
      text: 'text-violet-700 dark:text-violet-400',
      icon: <FileText className="w-3 h-3" />,
      label: 'Full Document'
    },
    ragChunks: {
      bg: 'bg-sky-50 dark:bg-sky-900/30',
      border: 'border-sky-200 dark:border-sky-800',
      text: 'text-sky-700 dark:text-sky-400',
      icon: <Database className="w-3 h-3" />,
      label: 'RAG Chunks'
    },
    hybrid: {
      bg: 'bg-amber-50 dark:bg-amber-900/30',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-400',
      icon: <Zap className="w-3 h-3" />,
      label: 'Hybride'
    },
    // v3.0.0: Nouveau mode Mémoire Collective
    memory: {
      bg: 'bg-green-50 dark:bg-green-900/30',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-400',
      icon: <Brain className="w-3 h-3" />,
      label: 'Mémoire Collective'
    }
  }

  // Déterminer le style à utiliser
  let style = modeStyles.ragChunks // Par défaut
  
  if (generationModeUi) {
    // Utiliser generationModeUi en priorité
    if (generationModeUi === 'Full Document') {
      style = modeStyles.fullDocument
    } else if (generationModeUi === 'RAG Chunks') {
      style = modeStyles.ragChunks
    } else if (generationModeUi === 'Hybride') {
      style = modeStyles.hybrid
    } else if (generationModeUi === 'Mémoire Collective') {
      style = modeStyles.memory
    }
  } else if (generationMode) {
    // Fallback sur generationMode
    if (generationMode === 'gemini') {
      style = modeStyles.fullDocument
    } else if (generationMode === 'chunks') {
      style = modeStyles.ragChunks
    } else if (generationMode === 'hybrid') {
      style = modeStyles.hybrid
    } else if (generationMode === 'memory') {
      style = modeStyles.memory
    }
  }

  // Label à afficher (priorité à generationModeUi)
  const displayLabel = generationModeUi || style.label

  // Cache status badge (uniquement pour Full Document)
  const renderCacheStatus = () => {
    if (!isFullDocument || !cacheStatus || cacheStatus === 'none') return null

    const isHit = cacheStatus === 'hit'
    
    return (
      <span 
        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
          isHit 
            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' 
            : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'
        }`}
        title={isHit ? 'Documents en cache (lecture rapide)' : 'Documents chargés'}
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
        title={`Mode: ${displayLabel}`}
      >
        {style.icon}
        {displayLabel}
      </span>

      {/* Cache Status (Full Document only) */}
      {renderCacheStatus()}

      {/* Documents count - pas affiché pour mode memory */}
      {!isMemory && documentsFound !== undefined && documentsFound > 0 && (
        <span className="text-[10px] text-stone-400 dark:text-stone-500">
          {documentsFound} doc{documentsFound > 1 ? 's' : ''}
        </span>
      )}

      {/* Processing time */}
      {processingTimeMs !== undefined && processingTimeMs > 0 && (
        <span className="text-[10px] text-stone-400 dark:text-stone-500">
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
