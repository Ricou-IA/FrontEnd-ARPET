// ============================================================
// Format Content Helper
// Transforme le Markdown simple en HTML
// ============================================================

/**
 * Transforme les citations inline [Document, Page X, Section Y.Z]
 * en liens cliquables avec data-attributes pour le handler de clic.
 *
 * Patterns détectés :
 * - [CCTP TCE, Page 56, Section 2.3.9.1]
 * - [CCTP TCE, Page 56]
 * - [CCTP, Pages 12-15]
 * - [Document.pdf, p.56]
 */
function formatCitations(text: string): string {
  // Pattern : [Texte, Page(s) X(-Y)(, Section ...)]
  const citationRegex = /\[([^\]]+?),\s*(?:Pages?\s*|p\.\s*)(\d+)(?:\s*[-–]\s*\d+)?(?:,\s*[^\]]+)?\]/g

  return text.replace(citationRegex, (_match, docPart: string, pageStr: string) => {
    const docName = docPart.trim()
    const page = parseInt(pageStr, 10)
    const escapedName = docName.replace(/"/g, '&quot;')

    return `<a href="#" class="source-citation" data-source-name="${escapedName}" data-source-page="${page}" title="Ouvrir ${escapedName} à la page ${page}">[${docName}, Page ${page}]</a>`
  })
}

/**
 * Convertit les tableaux Markdown en HTML <table>.
 * Détecte les blocs de lignes commençant par | et contenant un séparateur |---|.
 */
function formatTables(text: string): string {
  const tableBlockRegex = /((?:^\|.+\|[ \t]*$\n?)+)/gm

  return text.replace(tableBlockRegex, (block) => {
    const lines = block.trim().split('\n').filter(l => l.trim().length > 0)
    if (lines.length < 2) return block

    const separatorIndex = lines.findIndex(line => /^\|[\s\-:|]+\|$/.test(line.trim()))
    if (separatorIndex < 1) return block

    const bodyLines = lines.slice(separatorIndex + 1)

    const parseCells = (line: string): string[] =>
      line.split('|').slice(1, -1).map(cell => cell.trim())

    const headerCells = parseCells(lines[0])
    const headerHtml = headerCells
      .map(cell => `<th class="px-3 py-1.5 text-left text-[10px] font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">${cell}</th>`)
      .join('')

    const bodyHtml = bodyLines
      .map(line => {
        const cells = parseCells(line)
        const cellsHtml = cells
          .map(cell => `<td class="px-3 py-1.5 text-xs text-stone-700 dark:text-stone-300">${cell}</td>`)
          .join('')
        return `<tr class="border-t border-stone-100 dark:border-stone-800">${cellsHtml}</tr>`
      })
      .join('')

    return `<div class="overflow-x-auto my-3"><table class="min-w-full border border-stone-200 dark:border-stone-700 rounded text-left"><thead class="bg-stone-50 dark:bg-stone-800/50"><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`
  })
}

export function formatContent(content: string): string {
  let formatted = content

  // Citations inline AVANT le markdown (pour éviter que les [] soient altérés)
  formatted = formatCitations(formatted)

  // Tableaux AVANT les autres transformations (pour ne pas altérer les |)
  formatted = formatTables(formatted)

  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>')
  formatted = formatted.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded text-xs">$1</code>')
  formatted = formatted.replace(/^- (.+)$/gm, '• $1')
  formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<span class="font-medium">$1.</span> $2')
  formatted = formatted.replace(/\n\n/g, '</p><p class="mt-3">')
  formatted = formatted.replace(/\n/g, '<br>')

  if (!formatted.startsWith('<')) {
    formatted = `<p>${formatted}</p>`
  }

  return formatted
}
