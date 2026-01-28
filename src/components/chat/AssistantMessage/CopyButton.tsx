// ============================================================
// CopyButton Component
// Bouton pour copier le contenu du message
// ============================================================

import { useState, useCallback } from 'react'
import { Copy, CheckCircle } from 'lucide-react'

interface CopyButtonProps {
  content: string
}

export function CopyButton({ content }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Erreur copie:', err)
    }
  }, [content])

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        copied
          ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
          : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300'
      }`}
      title={copied ? 'Copié !' : 'Copier'}
    >
      {copied ? (
        <CheckCircle className="w-3.5 h-3.5" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? 'Copié' : 'Copier'}
    </button>
  )
}
