// ============================================================
// ARPET - MarkdownViewer Component
// Version: 1.0.0
// Date: 2026-02-07
//
// Affiche le contenu d'un fichier Markdown/Texte dans le viewer.
// Fetche le contenu depuis l'URL signee et le rend en HTML.
// ============================================================

import { useState, useEffect, useMemo } from 'react'
import { Loader2, FileWarning } from 'lucide-react'

interface MarkdownViewerProps {
  url: string
  filename: string
  zoom: number
}

/**
 * Parse basique du Markdown en HTML.
 * Gere : titres, bold, italic, code, listes, tableaux, separateurs, liens.
 */
function parseMarkdown(md: string): string {
  let html = md

  // Echapper les caracteres HTML dangereux
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Tableaux Markdown (AVANT les autres transformations)
  html = html.replace(/((?:^\|.+\|[ \t]*$\n?)+)/gm, (block) => {
    const lines = block.trim().split('\n').filter(l => l.trim().length > 0)
    if (lines.length < 2) return block

    const separatorIndex = lines.findIndex(line => /^\|[\s\-:|]+\|$/.test(line.trim()))
    if (separatorIndex < 1) return block

    const parseCells = (line: string): string[] =>
      line.split('|').slice(1, -1).map(cell => cell.trim())

    const headerCells = parseCells(lines[0])
    const bodyLines = lines.slice(separatorIndex + 1)

    const headerHtml = headerCells
      .map(cell => `<th class="px-3 py-2 text-left text-xs font-semibold text-stone-700 border border-stone-200">${cell}</th>`)
      .join('')

    const bodyHtml = bodyLines
      .map(line => {
        const cells = parseCells(line)
        const cellsHtml = cells
          .map(cell => `<td class="px-3 py-2 text-sm text-stone-700 border border-stone-200">${cell}</td>`)
          .join('')
        return `<tr class="even:bg-stone-50">${cellsHtml}</tr>`
      })
      .join('')

    return `<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-stone-200 rounded"><thead class="bg-stone-100"><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`
  })

  // Separateurs ---
  html = html.replace(/^---+$/gm, '<hr class="my-6 border-stone-200" />')

  // Titres (# → h1, ## → h2, etc.)
  html = html.replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold text-stone-800 mt-5 mb-2">$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-stone-800 mt-6 mb-2">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-stone-900 mt-8 mb-3 pb-1 border-b border-stone-200">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-stone-900 mt-4 mb-4">$1</h1>')

  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-stone-100 px-1.5 py-0.5 rounded text-xs font-mono text-stone-700">$1</code>')

  // Listes a puces (- item)
  html = html.replace(/((?:^- .+$\n?)+)/gm, (block) => {
    const items = block.trim().split('\n')
      .map(line => line.replace(/^- (.+)$/, '$1').trim())
      .filter(Boolean)
      .map(item => `<li class="ml-4 pl-1">${item}</li>`)
      .join('')
    return `<ul class="list-disc my-2 space-y-1 text-sm text-stone-700">${items}</ul>`
  })

  // Listes numerotees (1. item)
  html = html.replace(/((?:^\d+\. .+$\n?)+)/gm, (block) => {
    const items = block.trim().split('\n')
      .map(line => line.replace(/^\d+\. (.+)$/, '$1').trim())
      .filter(Boolean)
      .map(item => `<li class="ml-4 pl-1">${item}</li>`)
      .join('')
    return `<ol class="list-decimal my-2 space-y-1 text-sm text-stone-700">${items}</ol>`
  })

  // Paragraphes : double saut de ligne
  html = html.replace(/\n\n+/g, '</p><p class="my-2 text-sm text-stone-700 leading-relaxed">')

  // Simple saut de ligne
  html = html.replace(/\n/g, '<br>')

  // Wrapper
  html = `<p class="my-2 text-sm text-stone-700 leading-relaxed">${html}</p>`

  // Nettoyage paragraphes vides
  html = html.replace(/<p class="[^"]*"><\/p>/g, '')
  html = html.replace(/<p class="[^"]*"><br><\/p>/g, '')

  return html
}

export function MarkdownViewer({ url, filename, zoom }: MarkdownViewerProps) {
  const [content, setContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchContent() {
      setIsLoading(true)
      setHasError(false)

      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const text = await response.text()
        if (!cancelled) {
          setContent(text)
        }
      } catch (err) {
        if (!cancelled) {
          setHasError(true)
          setErrorMessage(err instanceof Error ? err.message : 'Erreur de chargement')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchContent()
    return () => { cancelled = true }
  }, [url])

  const renderedHtml = useMemo(() => {
    if (!content) return ''
    return parseMarkdown(content)
  }, [content])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white">
        <Loader2 className="w-8 h-8 text-stone-400 animate-spin mb-3" />
        <p className="text-sm text-stone-500">Chargement du document...</p>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-stone-400">
        <FileWarning className="w-12 h-12 mb-3" />
        <p className="text-sm font-medium">Impossible de charger le document</p>
        <p className="text-xs mt-1">{filename}</p>
        <p className="text-xs mt-1 text-stone-300">{errorMessage}</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-auto bg-white">
      <div
        className="max-w-none px-8 py-6"
        style={{
          fontSize: `${zoom * 100}%`,
          transformOrigin: 'top left',
        }}
      >
        {/* En-tete du document */}
        <div className="mb-6 pb-4 border-b border-stone-200">
          <p className="text-xs text-stone-400 uppercase tracking-wider">Document genere</p>
          <p className="text-sm text-stone-500 mt-1">{filename}</p>
        </div>

        {/* Contenu Markdown rendu */}
        <div
          className="prose prose-stone prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      </div>
    </div>
  )
}
