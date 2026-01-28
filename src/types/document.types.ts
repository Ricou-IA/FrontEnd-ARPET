// ============================================
// DOCUMENTS - sources.files (V2)
// ============================================

/**
 * Couche documentaire (enum rag.document_layer)
 * - app: Documents Métier (BAIKAL premium)
 * - org: Documents Organisation
 * - project: Documents Équipe/Chantier
 * - user: Documents Personnels
 */
export type DocumentLayer = 'app' | 'org' | 'project' | 'user';

/**
 * Statut de processing du fichier
 */
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'error';

/**
 * Statut de promotion (enum rag.document_status)
 * - draft: Document perso non promu
 * - pending: En attente de validation Team Leader
 * - approved: Validé (promu vers Équipe)
 * - rejected: Refusé
 */
export type PromotionStatus = 'draft' | 'pending' | 'approved' | 'rejected';

/**
 * Catégorie de document depuis Supabase (config.document_categories)
 * v6.1.1: is_active rendu optionnel (colonne peut ne pas exister)
 */
export interface DocumentCategoryConfig {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active?: boolean;  // v6.1.1: Optionnel car colonne peut ne pas exister
  target_apps: string[];
  target_layers: DocumentLayer[];
  source_type: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fichier source (table sources.files)
 * v6.1.0: Ajout can_edit et can_delete depuis la vue files_with_permissions
 */
export interface SourceFile {
  id: string;
  original_filename: string;
  mime_type: string | null;
  file_size: number | null;
  chunk_count: number;
  content_hash: string | null;

  // Classification
  layer: DocumentLayer;
  org_id: string | null;
  project_id: string | null;
  created_by: string | null;
  app_id: string | null;

  // Stockage
  storage_bucket: string;
  storage_path: string | null;

  // Processing
  ingestion_level: string;
  processing_status: ProcessingStatus;
  processing_error: string | null;
  processed_at: string | null;

  // Promotion (colonnes ajoutées)
  promotion_status: PromotionStatus;
  promotion_requested_at: string | null;
  promotion_requested_by: string | null;
  promotion_reviewed_at: string | null;
  promotion_reviewed_by: string | null;
  promotion_comment: string | null;

  // Métadonnées libres (catégorie = slug, etc.)
  metadata: {
    category?: string; // slug de la catégorie
    description?: string;
    tags?: string[];
    [key: string]: unknown;
  };

  // Timestamps
  created_at: string;
  updated_at: string;

  // =============================================
  // v6.1.0: PERMISSIONS (depuis vue files_with_permissions)
  // =============================================

  /** true si l'utilisateur peut éditer ce document */
  can_edit?: boolean;

  /** true si l'utilisateur peut supprimer ce document */
  can_delete?: boolean;
}

/**
 * Réunion (table sources.meetings)
 */
export interface SourceMeeting {
  id: string;
  user_id: string;
  org_id: string | null;
  project_id: string | null;
  title: string;
  audio_url: string | null;
  storage_bucket: string;
  storage_path: string | null;
  transcript: string | null;
  summary: string | null;
  action_items: Record<string, unknown> | null;
  processed: boolean;
  model_used: string;
  shared_with_team: boolean;
  created_at: string;
  updated_at: string;

  // =============================================
  // v6.1.0: PERMISSIONS (depuis vue meetings_with_permissions)
  // =============================================

  /** true si l'utilisateur peut éditer cette réunion */
  can_edit?: boolean;

  /** true si l'utilisateur peut supprimer cette réunion */
  can_delete?: boolean;
}

/**
 * Configuration UI pour chaque couche documentaire
 */
export const LAYER_CONFIG: Record<DocumentLayer, {
  label: string;
  labelPlural: string;
  icon: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  canUpload: boolean;
  canDelete: boolean;
  canPromote: boolean;
  canDownload: boolean;
}> = {
  app: {
    label: 'Métier',
    labelPlural: 'Documents Métier',
    icon: '🏛️',
    description: 'DTU, normes, réglementations BTP',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    canUpload: false,
    canDelete: false,
    canPromote: false,
    canDownload: true,
  },
  org: {
    label: 'Organisation',
    labelPlural: 'Documents Entreprise',
    icon: '🏢',
    description: 'Procédures et documents internes',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    canUpload: false,
    canDelete: false,
    canPromote: false,
    canDownload: true,
  },
  project: {
    label: 'Équipe',
    labelPlural: 'Documents Chantier',
    icon: '👥',
    description: 'Documents du chantier actif',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    canUpload: false,
    canDelete: false,
    canPromote: false,
    canDownload: true,
  },
  user: {
    label: 'Personnel',
    labelPlural: 'Mes Documents',
    icon: '👤',
    description: 'Vos documents personnels',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    canUpload: true,
    canDelete: true,
    canPromote: true,
    canDownload: true,
  },
};

// ============================================
// HELPERS DOCUMENTS
// ============================================

/**
 * Helper: Obtenir l'icône selon le type MIME
 */
export function getFileIcon(mimeType: string | null): string {
  if (!mimeType) return '📄';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📗';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('audio')) return '🎵';
  if (mimeType.includes('video')) return '🎬';
  return '📄';
}

/**
 * Helper: Formater la taille de fichier
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '-';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

/**
 * Helper: Obtenir le badge de statut promotion
 */
export function getPromotionBadge(status: PromotionStatus): {
  label: string;
  color: string;
  bgColor: string;
} | null {
  switch (status) {
    case 'pending':
      return { label: 'En attente', color: 'text-orange-700', bgColor: 'bg-orange-100' };
    case 'approved':
      return { label: 'Approuvé', color: 'text-green-700', bgColor: 'bg-green-100' };
    case 'rejected':
      return { label: 'Refusé', color: 'text-red-700', bgColor: 'bg-red-100' };
    default:
      return null;
  }
}

/**
 * Helper: Vérifier si une icône est un emoji ou un nom Lucide
 */
export function isEmojiIcon(icon: string | null): boolean {
  if (!icon) return false;
  // Les emojis commencent généralement par un caractère > \u00FF
  // Les noms Lucide sont en lowercase avec des tirets (ex: "book-open", "scale")
  return /^[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(icon);
}
