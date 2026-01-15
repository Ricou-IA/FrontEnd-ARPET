// ============================================================
// ARPET - RAG Version Toggle
// Composant pour switcher entre v2 et v3 pendant les tests
// ============================================================

import { useState, useEffect } from 'react'
import { getRagVersion, setRagVersion, toggleRagVersion } from '../services/chat.service'

interface RagVersionToggleProps {
  /** Position du toggle (défaut: bottom-right) */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  /** Afficher les détails (endpoint, etc.) */
  showDetails?: boolean
  /** Callback quand la version change */
  onVersionChange?: (version: 'v2' | 'v3') => void
}

export function RagVersionToggle({ 
  position = 'bottom-right',
  showDetails = false,
  onVersionChange 
}: RagVersionToggleProps) {
  const [version, setVersion] = useState<'v2' | 'v3'>(getRagVersion())
  const [isExpanded, setIsExpanded] = useState(false)

  // Sync avec le service
  useEffect(() => {
    setVersion(getRagVersion())
  }, [])

  const handleToggle = () => {
    const newVersion = toggleRagVersion()
    setVersion(newVersion)
    onVersionChange?.(newVersion)
  }

  const handleSetVersion = (v: 'v2' | 'v3') => {
    setRagVersion(v)
    setVersion(v)
    onVersionChange?.(v)
  }

  // Classes de position
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  }

  const isV3 = version === 'v3'

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Badge principal */}
      <div 
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg cursor-pointer
          transition-all duration-200 select-none
          ${isV3 
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
            : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          }
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Icône */}
        <span className="text-lg">
          {isV3 ? '🚀' : '🔧'}
        </span>
        
        {/* Label */}
        <span className="font-mono font-medium text-sm">
          RAG {version.toUpperCase()}
        </span>

        {/* Indicateur expand */}
        <svg 
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Panel étendu */}
      {isExpanded && (
        <div className="mt-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden min-w-[200px]">
          {/* Header */}
          <div className="px-3 py-2 bg-gray-900 border-b border-gray-700">
            <span className="text-xs text-gray-400 uppercase tracking-wider">
              Version RAG
            </span>
          </div>

          {/* Options */}
          <div className="p-2 space-y-1">
            {/* v2 */}
            <button
              onClick={() => handleSetVersion('v2')}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-md text-left
                transition-colors
                ${version === 'v2' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                }
              `}
            >
              <span className={`w-2 h-2 rounded-full ${version === 'v2' ? 'bg-blue-500' : 'bg-gray-600'}`} />
              <div className="flex-1">
                <div className="font-medium text-sm">v2 - Production</div>
                <div className="text-xs text-gray-500">baikal-brain</div>
              </div>
            </button>

            {/* v3 */}
            <button
              onClick={() => handleSetVersion('v3')}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-md text-left
                transition-colors
                ${version === 'v3' 
                  ? 'bg-emerald-900/50 text-emerald-300' 
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                }
              `}
            >
              <span className={`w-2 h-2 rounded-full ${version === 'v3' ? 'bg-emerald-500' : 'bg-gray-600'}`} />
              <div className="flex-1">
                <div className="font-medium text-sm">v3 - Expérimental</div>
                <div className="text-xs text-gray-500">baikal-brain-v3</div>
              </div>
            </button>
          </div>

          {/* Toggle rapide */}
          <div className="px-3 py-2 border-t border-gray-700">
            <button
              onClick={handleToggle}
              className="w-full py-2 px-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md text-sm font-medium transition-colors"
            >
              Basculer vers {isV3 ? 'v2' : 'v3'}
            </button>
          </div>

          {/* Détails v3 */}
          {showDetails && isV3 && (
            <div className="px-3 py-2 border-t border-gray-700 bg-emerald-900/20">
              <div className="text-xs text-emerald-400 space-y-1">
                <div>✓ Cache Gemini global</div>
                <div>✓ Scoring fichiers intelligent</div>
                <div>✓ Skip RAG conversationnel</div>
                <div>✓ Config depuis DB</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RagVersionToggle
