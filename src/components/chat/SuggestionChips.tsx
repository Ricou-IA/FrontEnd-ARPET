// ============================================================
// SuggestionChips Component
// Affiche les questions de suivi suggérées sous le dernier message
// ============================================================

import { FileText } from 'lucide-react'

export interface SuggestionItem {
  text: string
  source_hint: string
}

interface SuggestionChipsProps {
  suggestions: SuggestionItem[]
  onSuggestionClick: (suggestion: SuggestionItem) => void
  disabled?: boolean
}

export function SuggestionChips({
  suggestions,
  onSuggestionClick,
  disabled = false,
}: SuggestionChipsProps) {
  if (suggestions.length === 0) return null

  return (
    <div className="flex gap-4 animate-fade-in">
      {/* Avatar placeholder pour aligner avec les messages */}
      <div className="w-8 flex-shrink-0" />

      <div className="flex-1 max-w-2xl">
        <p className="text-[10px] text-stone-400 dark:text-stone-500 font-medium mb-2 flex items-center gap-1">
          <span>Questions suggérées</span>
        </p>
        <div className="flex flex-col gap-1.5">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick(suggestion)}
              disabled={disabled}
              className="
                flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700
                bg-white/80 dark:bg-stone-900/80 text-left transition-all duration-150
                hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/50 dark:hover:bg-amber-900/20
                hover:shadow-sm active:scale-[0.99]
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-stone-900
              "
            >
              <div className="flex-1 min-w-0">
                <span className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                  {suggestion.text}
                </span>
                {suggestion.source_hint && (
                  <span className="flex items-center gap-1 mt-1 text-[10px] text-stone-400 dark:text-stone-500">
                    <FileText className="w-2.5 h-2.5" />
                    {suggestion.source_hint}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
