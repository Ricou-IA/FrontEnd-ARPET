// ============================================================
// ARPET - StreamingBubble Component
// Version: 4.0.0 - Bulle transparente + masquage citations
// Date: 2026-01-05
// Changes:
//   - Suppression fond/bordure/shadow (effet papier quadrillé)
//   - Masquage des balises <cite> pendant le streaming
//   - Lecture fluide sans interruption
// ============================================================

import { memo } from 'react'
import type { SSEStepEvent } from '../../services/chat.service'

interface StepsIndicatorProps {
    steps: SSEStepEvent[]
    isComplete: boolean
}

function StepsIndicator({ steps, isComplete }: StepsIndicatorProps) {
    if (steps.length === 0) return null

    return (
        <div className="flex flex-col gap-2 mb-4">
            {steps.map((step, index) => {
                const isLast = index === steps.length - 1
                const isDone = !isLast || isComplete

                return (
                    <div
                        key={`${step.step}-${index}`}
                        className={`
                            flex items-center gap-2 text-[11px] transition-all duration-300
                            ${isDone ? 'text-stone-400 dark:text-stone-500' : 'text-stone-600 dark:text-stone-300'}
                        `}
                    >
                        {/* Icône : check si terminé, spinner si en cours */}
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-stone-100 dark:bg-stone-800'}`}>
                            {isDone ? (
                                <svg
                                    className="w-2.5 h-2.5 text-emerald-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.5}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            ) : (
                                <div className="w-2 h-2 rounded-full border-2 border-stone-300 border-t-stone-600 animate-spin" />
                            )}
                        </div>

                        {/* Message de l'étape */}
                        <span className={`font-medium tracking-tight ${isDone ? 'opacity-60' : ''}`}>
                            {step.message}
                        </span>

                        {/* Détails optionnels */}
                        {step.details && step.details.mode && !isDone && (
                            <span className="ml-auto px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-[9px] font-mono text-stone-500 uppercase tracking-wider">
                                {step.details.mode}
                            </span>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

/**
 * Nettoyer le contenu pour le streaming
 * - Supprime les balises <cite> pour une lecture fluide
 */
function cleanStreamingContent(content: string): string {
    // Supprimer les balises <cite doc="..." page="...">texte</cite>
    return content.replace(/<cite[^>]*>[^<]*<\/cite>/g, '')
}

interface StreamingBubbleProps {
    content: string
    steps: SSEStepEvent[]
    stepsComplete: boolean
}

export const StreamingBubble = memo(function StreamingBubble({
    content,
    steps,
    stepsComplete
}: StreamingBubbleProps) {
    // Nettoyer le contenu (masquer les citations)
    const displayContent = cleanStreamingContent(content)

    return (
        <div className="flex gap-5 animate-[slideDownFade_0.3s_ease-out]">
            <div className="w-9 h-9 rounded-xl bg-stone-900 dark:bg-white flex items-center justify-center text-white dark:text-stone-900 font-serif italic text-sm flex-shrink-0 mt-1 shadow-md shadow-stone-900/10">
                A
            </div>
            <div className="flex-1 max-w-4xl">
                {/* Zone de contenu - Transparente pour effet papier quadrillé */}
                <div className="relative text-[15px] text-stone-700 dark:text-stone-200 leading-relaxed p-6">

                    {/* Indicateur d'étapes */}
                    {steps.length > 0 && (
                        <StepsIndicator steps={steps} isComplete={stepsComplete} />
                    )}

                    {/* Contenu en streaming */}
                    {displayContent ? (
                        <div className="prose prose-sm prose-stone dark:prose-invert max-w-none font-sans whitespace-pre-wrap">
                            {displayContent}
                            <span className="inline-block w-1.5 h-4 bg-stone-400 dark:bg-stone-500 animate-pulse ml-0.5 align-middle rounded-full" />
                        </div>
                    ) : steps.length === 0 ? (
                        // Animation d'attente (avant la première étape)
                        <div className="flex gap-1.5 py-2">
                            <span className="w-1.5 h-1.5 bg-stone-400 dark:bg-stone-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-stone-400 dark:bg-stone-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-stone-400 dark:bg-stone-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
})
