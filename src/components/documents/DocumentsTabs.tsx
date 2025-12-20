// ============================================================
// ARPET - DocumentsTabs Component
// Version: 2.3.0 - Fix onglet actif sans mouvement vertical
// Date: 2025-12-20
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
    <div className="flex-shrink-0 bg-transparent">
      <div className="flex px-6 gap-12">
        {LAYERS_ORDER.map((layer) => {
          const config = LAYER_CONFIG[layer]
          const isActive = documentsActiveLayer === layer
          const count = counts[layer]

          return (
            <button
              key={layer}
              onClick={() => setDocumentsActiveLayer(layer)}
              className={`
                relative flex items-center gap-2 px-0 py-4 text-base font-medium transition-colors
                ${isActive 
                  ? 'text-slate-900' 
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              {/* Point bleu marine pour l'actif */}
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B0F17]" />
              )}
              
              {/* Label */}
              <span>{config.label}</span>
              
              {/* Badge count */}
              {count > 0 && (
                <span className={`
                  text-[10px] font-medium px-1.5 py-0.5 rounded min-w-[20px] text-center
                  ${isActive 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-gray-100 text-gray-500'
                  }
                `}>
                  {count}
                </span>
              )}

              {/* Soulignement actif - positionné en absolute pour éviter le décalage */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
