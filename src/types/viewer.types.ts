// ============================================
// VIEWER - Split View (V2)
// ============================================

/**
 * Document à afficher dans le viewer
 */
export interface ViewerDocument {
  id: string;
  filename: string;
  url: string;
  mimeType: string | null;
  fileSize: number | null;
  // Optionnel: pour navigation directe vers une page/section
  initialPage?: number;
  highlightText?: string;
}

/**
 * État du viewer dans le store
 */
export interface ViewerState {
  isOpen: boolean;
  document: ViewerDocument | null;
  currentPage: number;
  totalPages: number;
  zoom: number;
  isLoading: boolean;
}

// ============================================
// HELPERS VIEWER
// ============================================

/**
 * Helper: Vérifier si un fichier est visualisable
 */
export function isViewableFile(mimeType: string | null, filename: string): boolean {
  if (!mimeType && !filename) return false;

  // PDF
  if (mimeType?.includes('pdf') || filename.toLowerCase().endsWith('.pdf')) {
    return true;
  }

  // Images
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const isImageMime = mimeType?.startsWith('image/');
  const isImageExt = imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));

  if (isImageMime || isImageExt) return true;

  // Markdown / Texte
  const textExtensions = ['.md', '.markdown', '.txt'];
  const isTextMime = mimeType === 'text/markdown' || mimeType === 'text/plain';
  const isTextExt = textExtensions.some(ext => filename.toLowerCase().endsWith(ext));

  return isTextMime || isTextExt;
}

/**
 * Helper: Obtenir le type de viewer approprié
 */
export function getViewerType(mimeType: string | null, filename: string): 'pdf' | 'image' | 'markdown' | 'unsupported' {
  if (mimeType?.includes('pdf') || filename.toLowerCase().endsWith('.pdf')) {
    return 'pdf';
  }

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const isImageMime = mimeType?.startsWith('image/');
  const isImageExt = imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));

  if (isImageMime || isImageExt) {
    return 'image';
  }

  // Markdown / Texte
  const textExtensions = ['.md', '.markdown', '.txt'];
  const isTextMime = mimeType === 'text/markdown' || mimeType === 'text/plain';
  const isTextExt = textExtensions.some(ext => filename.toLowerCase().endsWith(ext));

  if (isTextMime || isTextExt) {
    return 'markdown';
  }

  return 'unsupported';
}
