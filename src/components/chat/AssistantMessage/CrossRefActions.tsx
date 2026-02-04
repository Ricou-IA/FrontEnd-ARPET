// ============================================================
// CrossRefActions Component
// Boutons follow-up pour le croisement de documents
// ============================================================

import { ArrowLeftRight, CheckCircle, FileText } from 'lucide-react'
import type { Message } from '../../../types'

type CrossRefActionItem = NonNullable<Message['cross_ref_actions']>[number]

interface CrossRefActionsProps {
  actions: Message['cross_ref_actions']
  onAction: (action: CrossRefActionItem) => void
  disabled?: boolean
}

const ACTION_ICONS = {
  compare: ArrowLeftRight,
  compliance: CheckCircle,
  synthesize: FileText,
} as const

const ACTION_COLORS = {
  compare: 'hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20',
  compliance: 'hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
  synthesize: 'hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20',
} as const

export function CrossRefActions({ actions, onAction, disabled }: CrossRefActionsProps) {
  if (!actions || actions.length === 0) return null

  return (
    <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800">
      <p className="text-[10px] text-stone-400 dark:text-stone-500 font-medium mb-1.5">
        Approfondir :
      </p>
      <div className="flex flex-col gap-1.5">
        {actions.map((action, index) => {
          const Icon = ACTION_ICONS[action.type] || FileText
          const colorClass = ACTION_COLORS[action.type] || ACTION_COLORS.synthesize
          const docsLabel = action.documents.join(' / ')

          return (
            <button
              key={`${action.type}-${index}`}
              onClick={() => onAction(action)}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700
                bg-white dark:bg-stone-900 text-left transition-all duration-150
                ${colorClass}
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-stone-900
              `}
              title={action.description}
            >
              <Icon className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  {action.label}
                </span>
                {docsLabel && (
                  <span className="ml-2 text-[10px] italic text-stone-400 dark:text-stone-500 truncate">
                    {docsLabel}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
