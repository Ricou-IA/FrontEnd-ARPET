/**
 * Markdown to PDF Converter - Phase 7/8
 * Version: 2.0.0 — Ecriture directe via jsPDF (plus de html2canvas)
 *
 * Convertit du Markdown en PDF via jsPDF en ecrivant le texte
 * directement dans le PDF ligne par ligne. Fiable, pas de
 * dependance au rendu DOM/canvas.
 */

import { jsPDF } from 'jspdf';

// ============================================================
// TYPES INTERNES
// ============================================================

interface PdfContext {
  doc: jsPDF;
  y: number;
  pageWidth: number;
  pageHeight: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  contentWidth: number;
  lineHeight: number;
}

type MdLineType =
  | 'h1' | 'h2' | 'h3' | 'h4'
  | 'hr'
  | 'bullet'
  | 'numbered'
  | 'table-row'
  | 'empty'
  | 'text';

interface ParsedLine {
  type: MdLineType;
  content: string;
  raw: string;
}

// ============================================================
// CONSTANTES
// ============================================================

const FONT_SIZES = {
  h1: 16,
  h2: 14,
  h3: 12,
  h4: 11,
  body: 10,
  small: 8,
  footer: 7,
} as const;

const COLORS = {
  black: '#111827',
  dark: '#1f2937',
  body: '#374151',
  muted: '#6b7280',
  light: '#9ca3af',
  border: '#d1d5db',
  bg: '#f3f4f6',
} as const;

// ============================================================
// HELPERS
// ============================================================

/** Map des entities HTML courantes vers leurs caracteres */
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
  '&nbsp;': ' ', '&ndash;': '–', '&mdash;': '—', '&laquo;': '«', '&raquo;': '»',
  '&eacute;': 'é', '&egrave;': 'è', '&ecirc;': 'ê', '&euml;': 'ë',
  '&agrave;': 'à', '&acirc;': 'â', '&auml;': 'ä',
  '&ugrave;': 'ù', '&ucirc;': 'û', '&uuml;': 'ü',
  '&ocirc;': 'ô', '&ouml;': 'ö',
  '&icirc;': 'î', '&iuml;': 'ï',
  '&ccedil;': 'ç', '&Eacute;': 'É', '&Egrave;': 'È', '&Ecirc;': 'Ê',
  '&Agrave;': 'À', '&Acirc;': 'Â', '&Ugrave;': 'Ù', '&Ucirc;': 'Û',
  '&Ocirc;': 'Ô', '&Ccedil;': 'Ç', '&oelig;': 'œ', '&OElig;': 'Œ',
};

/** Decode les entities HTML (&eacute; → e, &#233; → e, etc.) */
function decodeHtmlEntities(text: string): string {
  // Named entities
  let s = text.replace(/&[a-zA-Z]+;/g, (match) => HTML_ENTITIES[match] ?? match);
  // Numeric decimal entities (&#233; → é)
  s = s.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  // Numeric hex entities (&#xE9; → é)
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return s;
}

/** Supprime les emojis (non supportes par Helvetica dans jsPDF) et les remplace par un equivalent texte */
function stripEmojis(text: string): string {
  // Remplacements courants dans le contexte ARPET
  const emojiMap: [RegExp, string][] = [
    [/📋/g, ''], [/📄/g, ''], [/📌/g, ''], [/📎/g, ''],
    [/✅/g, '[OK]'], [/❌/g, '[X]'], [/⚠️/g, '/!\\'], [/🔴/g, '(!)'],
    [/🟡/g, '(~)'], [/🟢/g, '(v)'], [/⏳/g, '(...)'], [/🔜/g, '(->)'],
    [/📅/g, ''], [/📆/g, ''], [/🏗️/g, ''], [/🔧/g, ''],
    [/👷/g, ''], [/📐/g, ''], [/📊/g, ''], [/💡/g, ''],
    [/🔍/g, ''], [/📝/g, ''], [/🎯/g, ''], [/🚧/g, ''],
    [/📖/g, ''], [/📂/g, ''], [/⚡/g, ''], [/🔗/g, ''],
    [/➡️/g, '->'], [/→/g, '->'], [/•/g, '-'],
  ];
  let s = text;
  for (const [pattern, replacement] of emojiMap) {
    s = s.replace(pattern, replacement);
  }
  // Fallback: supprimer tout emoji Unicode restant (ranges emoji)
  // eslint-disable-next-line no-misleading-character-class
  s = s.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '');
  return s;
}

function stripInlineMarkdown(text: string): string {
  // 1. Decode HTML entities
  let s = decodeHtmlEntities(text);
  // 2. Bold+italic
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  // Bold
  s = s.replace(/\*\*(.+?)\*\*/g, '$1');
  s = s.replace(/__(.+?)__/g, '$1');
  // Italic
  s = s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1');
  // Inline code
  s = s.replace(/`([^`]+)`/g, '$1');
  // 3. Strip emojis
  s = stripEmojis(s);
  // Cleanup double espaces
  s = s.replace(/\s{2,}/g, ' ');
  return s.trim();
}

function parseLine(raw: string): ParsedLine {
  const trimmed = raw.trimEnd();

  if (/^#{1}\s+/.test(trimmed)) {
    return { type: 'h1', content: trimmed.replace(/^#\s+/, ''), raw };
  }
  if (/^#{2}\s+/.test(trimmed)) {
    return { type: 'h2', content: trimmed.replace(/^##\s+/, ''), raw };
  }
  if (/^#{3}\s+/.test(trimmed)) {
    return { type: 'h3', content: trimmed.replace(/^###\s+/, ''), raw };
  }
  if (/^#{4}\s+/.test(trimmed)) {
    return { type: 'h4', content: trimmed.replace(/^####\s+/, ''), raw };
  }
  if (/^---+\s*$/.test(trimmed)) {
    return { type: 'hr', content: '', raw };
  }
  if (/^- /.test(trimmed)) {
    return { type: 'bullet', content: trimmed.replace(/^- /, ''), raw };
  }
  if (/^\d+\.\s/.test(trimmed)) {
    return { type: 'numbered', content: trimmed.replace(/^\d+\.\s/, ''), raw };
  }
  if (/^\|/.test(trimmed) && /\|$/.test(trimmed)) {
    return { type: 'table-row', content: trimmed, raw };
  }
  if (trimmed === '') {
    return { type: 'empty', content: '', raw };
  }

  return { type: 'text', content: trimmed, raw };
}

function ensureSpace(ctx: PdfContext, needed: number): void {
  if (ctx.y + needed > ctx.pageHeight - ctx.marginBottom) {
    ctx.doc.addPage();
    ctx.y = ctx.marginTop;
  }
}

/** Wrap text to fit within maxWidth and return lines */
function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

// ============================================================
// RENDERING FUNCTIONS
// ============================================================

function renderHeader(ctx: PdfContext, title: string, date: string): void {
  // Logo / brand
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(14);
  ctx.doc.setTextColor(COLORS.black);
  ctx.doc.text('ARPET', ctx.marginLeft, ctx.y);

  // Date a droite
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(FONT_SIZES.small);
  ctx.doc.setTextColor(COLORS.muted);
  ctx.doc.text(date, ctx.pageWidth - ctx.marginRight, ctx.y, { align: 'right' });

  ctx.y += 6;

  // Titre du document
  if (title) {
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.setFontSize(FONT_SIZES.body);
    ctx.doc.setTextColor(COLORS.muted);
    ctx.doc.text(title, ctx.marginLeft, ctx.y);
    ctx.y += 4;
  }

  // Ligne de separation
  ctx.doc.setDrawColor(COLORS.black);
  ctx.doc.setLineWidth(0.5);
  ctx.doc.line(ctx.marginLeft, ctx.y, ctx.pageWidth - ctx.marginRight, ctx.y);
  ctx.y += 8;
}

function renderFooter(ctx: PdfContext, date: string): void {
  const totalPages = ctx.doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    ctx.doc.setPage(i);
    const footerY = ctx.pageHeight - 10;

    // Ligne
    ctx.doc.setDrawColor(COLORS.border);
    ctx.doc.setLineWidth(0.2);
    ctx.doc.line(ctx.marginLeft, footerY - 3, ctx.pageWidth - ctx.marginRight, footerY - 3);

    // Texte
    ctx.doc.setFont('helvetica', 'italic');
    ctx.doc.setFontSize(FONT_SIZES.footer);
    ctx.doc.setTextColor(COLORS.light);
    ctx.doc.text(
      `Genere par ARPET le ${date} — Synthese automatique`,
      ctx.marginLeft,
      footerY,
    );
    ctx.doc.text(
      `${i} / ${totalPages}`,
      ctx.pageWidth - ctx.marginRight,
      footerY,
      { align: 'right' },
    );
  }
}

function renderH1(ctx: PdfContext, text: string): void {
  ensureSpace(ctx, 12);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(FONT_SIZES.h1);
  ctx.doc.setTextColor(COLORS.black);

  const lines = wrapText(ctx.doc, stripInlineMarkdown(text), ctx.contentWidth);
  for (const line of lines) {
    ensureSpace(ctx, 7);
    ctx.doc.text(line, ctx.marginLeft, ctx.y);
    ctx.y += 7;
  }
  ctx.y += 3;
}

function renderH2(ctx: PdfContext, text: string): void {
  ensureSpace(ctx, 14);
  ctx.y += 4;
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(FONT_SIZES.h2);
  ctx.doc.setTextColor(COLORS.black);

  const lines = wrapText(ctx.doc, stripInlineMarkdown(text), ctx.contentWidth);
  for (const line of lines) {
    ensureSpace(ctx, 6);
    ctx.doc.text(line, ctx.marginLeft, ctx.y);
    ctx.y += 6;
  }

  // Underline
  ctx.y += 1;
  ctx.doc.setDrawColor(COLORS.border);
  ctx.doc.setLineWidth(0.2);
  ctx.doc.line(ctx.marginLeft, ctx.y, ctx.pageWidth - ctx.marginRight, ctx.y);
  ctx.y += 4;
}

function renderH3(ctx: PdfContext, text: string): void {
  ensureSpace(ctx, 10);
  ctx.y += 3;
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(FONT_SIZES.h3);
  ctx.doc.setTextColor(COLORS.dark);

  const lines = wrapText(ctx.doc, stripInlineMarkdown(text), ctx.contentWidth);
  for (const line of lines) {
    ensureSpace(ctx, 5.5);
    ctx.doc.text(line, ctx.marginLeft, ctx.y);
    ctx.y += 5.5;
  }
  ctx.y += 2;
}

function renderH4(ctx: PdfContext, text: string): void {
  ensureSpace(ctx, 8);
  ctx.y += 2;
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(FONT_SIZES.h4);
  ctx.doc.setTextColor(COLORS.dark);

  const lines = wrapText(ctx.doc, stripInlineMarkdown(text), ctx.contentWidth);
  for (const line of lines) {
    ensureSpace(ctx, 5);
    ctx.doc.text(line, ctx.marginLeft, ctx.y);
    ctx.y += 5;
  }
  ctx.y += 1;
}

function renderHr(ctx: PdfContext): void {
  ensureSpace(ctx, 8);
  ctx.y += 3;
  ctx.doc.setDrawColor(COLORS.border);
  ctx.doc.setLineWidth(0.3);
  ctx.doc.line(ctx.marginLeft, ctx.y, ctx.pageWidth - ctx.marginRight, ctx.y);
  ctx.y += 5;
}

function renderBullet(ctx: PdfContext, text: string): void {
  const indent = 6;
  const bulletX = ctx.marginLeft + 2;
  const textX = ctx.marginLeft + indent;
  const maxW = ctx.contentWidth - indent;

  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(FONT_SIZES.body);
  ctx.doc.setTextColor(COLORS.body);

  const lines = wrapText(ctx.doc, stripInlineMarkdown(text), maxW);
  ensureSpace(ctx, lines.length * ctx.lineHeight);

  // Bullet dot
  ctx.doc.setFillColor(COLORS.body);
  ctx.doc.circle(bulletX, ctx.y - 1, 0.6, 'F');

  for (const line of lines) {
    ensureSpace(ctx, ctx.lineHeight);
    ctx.doc.text(line, textX, ctx.y);
    ctx.y += ctx.lineHeight;
  }
}

function renderNumbered(ctx: PdfContext, text: string, index: number): void {
  const indent = 8;
  const numX = ctx.marginLeft;
  const textX = ctx.marginLeft + indent;
  const maxW = ctx.contentWidth - indent;

  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(FONT_SIZES.body);
  ctx.doc.setTextColor(COLORS.body);

  const lines = wrapText(ctx.doc, stripInlineMarkdown(text), maxW);
  ensureSpace(ctx, lines.length * ctx.lineHeight);

  // Number
  ctx.doc.text(`${index}.`, numX, ctx.y);

  for (const line of lines) {
    ensureSpace(ctx, ctx.lineHeight);
    ctx.doc.text(line, textX, ctx.y);
    ctx.y += ctx.lineHeight;
  }
}

function renderText(ctx: PdfContext, text: string): void {
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(FONT_SIZES.body);
  ctx.doc.setTextColor(COLORS.body);

  const lines = wrapText(ctx.doc, stripInlineMarkdown(text), ctx.contentWidth);
  for (const line of lines) {
    ensureSpace(ctx, ctx.lineHeight);
    ctx.doc.text(line, ctx.marginLeft, ctx.y);
    ctx.y += ctx.lineHeight;
  }
}

function renderTable(ctx: PdfContext, tableLines: ParsedLine[]): void {
  const parseCells = (line: string): string[] =>
    line.split('|').slice(1, -1).map(cell => cell.trim());

  // Trouver le separateur
  const sepIdx = tableLines.findIndex(l => /^\|[\s\-:|]+\|$/.test(l.content.trim()));
  if (sepIdx < 1) {
    // Not a valid table, render as text
    for (const line of tableLines) {
      renderText(ctx, line.content);
    }
    return;
  }

  const headerCells = parseCells(tableLines[0].content);
  const bodyRows = tableLines.slice(sepIdx + 1).map(l => parseCells(l.content));
  const numCols = headerCells.length;
  if (numCols === 0) return;

  const colWidth = ctx.contentWidth / numCols;
  const cellPadding = 2;
  const rowHeight = 6;

  // Espace necessaire
  const totalHeight = (1 + bodyRows.length) * rowHeight + 4;
  ensureSpace(ctx, Math.min(totalHeight, 40));

  ctx.y += 2;

  // Header row (gris)
  const headerY = ctx.y;
  ctx.doc.setFillColor(COLORS.bg);
  ctx.doc.rect(ctx.marginLeft, headerY - 4, ctx.contentWidth, rowHeight, 'F');

  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(FONT_SIZES.small + 1);
  ctx.doc.setTextColor(COLORS.dark);

  for (let c = 0; c < numCols; c++) {
    const x = ctx.marginLeft + c * colWidth + cellPadding;
    const cellText = stripInlineMarkdown(headerCells[c] || '');
    const truncated = ctx.doc.splitTextToSize(cellText, colWidth - cellPadding * 2)[0] || '';
    ctx.doc.text(truncated, x, headerY);
  }

  ctx.y = headerY + rowHeight - 2;

  // Body rows
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(FONT_SIZES.small);
  ctx.doc.setTextColor(COLORS.body);

  for (const row of bodyRows) {
    ensureSpace(ctx, rowHeight);

    // Border line
    ctx.doc.setDrawColor(COLORS.border);
    ctx.doc.setLineWidth(0.1);
    ctx.doc.line(ctx.marginLeft, ctx.y - 3, ctx.marginLeft + ctx.contentWidth, ctx.y - 3);

    for (let c = 0; c < numCols; c++) {
      const x = ctx.marginLeft + c * colWidth + cellPadding;
      const cellText = stripInlineMarkdown(row[c] || '');
      const truncated = ctx.doc.splitTextToSize(cellText, colWidth - cellPadding * 2)[0] || '';
      ctx.doc.text(truncated, x, ctx.y);
    }

    ctx.y += rowHeight - 2;
  }

  // Bottom border
  ctx.doc.setDrawColor(COLORS.border);
  ctx.doc.setLineWidth(0.1);
  ctx.doc.line(ctx.marginLeft, ctx.y - 1, ctx.marginLeft + ctx.contentWidth, ctx.y - 1);

  ctx.y += 4;
}

// ============================================================
// MAIN EXPORT
// ============================================================

/**
 * Convertit du contenu Markdown en Blob PDF.
 * Ecriture directe via jsPDF — pas de html2canvas, pas de DOM.
 */
export async function convertMarkdownToPdf(
  markdown: string,
  title: string,
  options?: {
    companyName?: string;
    date?: string;
  }
): Promise<Blob> {
  const date = options?.date || new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
  });

  const ctx: PdfContext = {
    doc,
    y: 20,
    pageWidth: 210,
    pageHeight: 297,
    marginLeft: 15,
    marginRight: 15,
    marginTop: 20,
    marginBottom: 25,
    contentWidth: 180, // 210 - 15 - 15
    lineHeight: 4.5,
  };

  // Header
  renderHeader(ctx, title, date);

  // Pre-traitement : decoder les entities HTML dans tout le markdown
  const cleanedMarkdown = decodeHtmlEntities(markdown);

  // Parse toutes les lignes
  const rawLines = cleanedMarkdown.split('\n');
  const parsed = rawLines.map(parseLine);

  let i = 0;
  let numberedIndex = 0;

  while (i < parsed.length) {
    const line = parsed[i];

    switch (line.type) {
      case 'h1':
        renderH1(ctx, line.content);
        break;
      case 'h2':
        renderH2(ctx, line.content);
        break;
      case 'h3':
        renderH3(ctx, line.content);
        break;
      case 'h4':
        renderH4(ctx, line.content);
        break;
      case 'hr':
        renderHr(ctx);
        break;
      case 'bullet':
        renderBullet(ctx, line.content);
        break;
      case 'numbered': {
        numberedIndex++;
        renderNumbered(ctx, line.content, numberedIndex);
        // Reset counter si la ligne suivante n'est pas numerotee
        if (i + 1 >= parsed.length || parsed[i + 1].type !== 'numbered') {
          numberedIndex = 0;
        }
        break;
      }
      case 'table-row': {
        // Collecter toutes les lignes du tableau
        const tableLines: ParsedLine[] = [];
        while (i < parsed.length && parsed[i].type === 'table-row') {
          tableLines.push(parsed[i]);
          i++;
        }
        renderTable(ctx, tableLines);
        continue; // Skip i++ at end
      }
      case 'empty':
        ctx.y += 2;
        break;
      case 'text':
        renderText(ctx, line.content);
        break;
    }

    i++;
  }

  // Footer sur toutes les pages
  renderFooter(ctx, date);

  // Retourner le blob
  const blob = doc.output('blob');
  return blob;
}
