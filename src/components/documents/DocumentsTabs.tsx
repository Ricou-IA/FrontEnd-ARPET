// ============================================================
// ARPET - DocumentsTabs Component
// Version: 1.0.0 - Onglets navigation 4 couches documentaires
// Date: 2025-12-18
// ============================================================

import { useAppStore } from '@/stores/appStore'
import { LAYER_CONFIG, type DocumentLayer } from '@/types'

interface DocumentsTabsProps {
  counts: Record<DocumentLayer, number>
}

const LAYERS_ORDER: DocumentLayer[] = ['app', 'org', 'project', 'user']

export function DocumentsTabs({ counts }: DocumentsTabsProps) {
  const { documentsActiveLayer, setDocumentsActiveLayer } = useAppStore()

  return (
    <div className="flex-shrink-0 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <div className="flex px-6">
        {LAYERS_ORDER.map((layer) => {
          const config = LAYER_CONFIG[layer]
          const isActive = documentsActiveLayer === layer
          const count = counts[layer]

          return (
            <button
              key={layer}
              onClick={() => setDocumentsActiveLayer(layer)}
              className={`
                relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
                ${isActive 
                  ? 'text-stone-800 dark:text-stone-100' 
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                }
              `}
            >
              {/* Icône */}
              <span className="text-base">{config.icon}</span>
              
              {/* Label */}
              <span>{config.label}</span>
              
              {/* Badge count */}
              {count > 0 && (
                <span className={`
                  text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center
                  ${isActive 
                    ? `${config.bgColor} ${config.color}` 
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                  }
                `}>
                  {count}
                </span>
              )}

              {/* Indicateur actif */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-800 dark:bg-stone-200 rounded-t-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
