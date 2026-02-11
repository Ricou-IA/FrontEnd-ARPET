// ============================================================
// Documents Service - Barrel File
// Réexporte toutes les fonctions pour rétro-compatibilité
// ============================================================

// Types
export type { ServiceResult, UserProfile } from './document-auth.helper';
export type { UploadFileInput, UpdateFileInput } from './document-mutations.service';

// Auth helper (usage interne principalement)
export { getCurrentProfile } from './document-auth.helper';

// Categories
export { getDocumentCategories } from './document-categories.service';

// Queries (lecture)
export {
  getFilesByLayer,
  getFileById,
  getFileDownloadUrl,
  getSourceFileByChunkId,
  getSourceFileById,
} from './document-queries.service';

// Mutations (écriture)
export {
  uploadFile,
  updateFile,
  deleteFile,
} from './document-mutations.service';

// Promotion
export {
  requestPromotion,
  approvePromotion,
  rejectPromotion,
} from './document-promotion.service';

// Stats
export {
  getFilesCountByLayer,
  getPendingPromotionsCount,
} from './document-stats.service';

// Projects
export { getUserProjects } from './projects.service';

// Mocks (tests)
export { getMockUserFiles } from './document-mocks';
