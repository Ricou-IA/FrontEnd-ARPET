// ============================================================
// Document Mocks
// Données mockées pour les tests
// ============================================================

import type { SourceFile } from '@/types';

// ============================================================
// MOCK DATA (pour tests)
// ============================================================

/**
 * Génère des fichiers mockés pour la couche user (Perso)
 * Note: category contient maintenant un UUID
 */
export function getMockUserFiles(): SourceFile[] {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();

  // UUID fictifs pour les catégories mock
  const MOCK_CAT_PIECES_MARCHE = 'bdf87560-6e1d-4bf9-84e3-620e94ee8b83';
  const MOCK_CAT_SUIVI = 'mock-cat-suivi';
  const MOCK_CAT_AUTRES = 'mock-cat-autres';

  return [
    {
      id: 'mock-1',
      original_filename: 'CCTP_Lot_GO_v2.pdf',
      mime_type: 'application/pdf',
      file_size: 2458000,
      chunk_count: 45,
      content_hash: null,
      layer: 'user',
      org_id: 'mock-org',
      project_id: null,
      created_by: 'mock-user',
      app_id: 'arpet',
      storage_bucket: 'user-workspace',
      storage_path: 'mock/cctp.pdf',
      ingestion_level: 'user',
      processing_status: 'completed',
      processing_error: null,
      processed_at: yesterday,
      promotion_status: 'draft',
      promotion_requested_at: null,
      promotion_requested_by: null,
      promotion_reviewed_at: null,
      promotion_reviewed_by: null,
      promotion_comment: null,
      metadata: { category: MOCK_CAT_PIECES_MARCHE, description: 'CCTP Gros Oeuvre mis à jour' },
      created_at: yesterday,
      updated_at: yesterday,
      can_edit: true,
      can_delete: true,
    },
    {
      id: 'mock-2',
      original_filename: 'Planning_S52.xlsx',
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      file_size: 156000,
      chunk_count: 0,
      content_hash: null,
      layer: 'user',
      org_id: 'mock-org',
      project_id: null,
      created_by: 'mock-user',
      app_id: 'arpet',
      storage_bucket: 'user-workspace',
      storage_path: 'mock/planning.xlsx',
      ingestion_level: 'user',
      processing_status: 'completed',
      processing_error: null,
      processed_at: now,
      promotion_status: 'pending',
      promotion_requested_at: now,
      promotion_requested_by: 'mock-user',
      promotion_reviewed_at: null,
      promotion_reviewed_by: null,
      promotion_comment: 'Planning prévisionnel pour la semaine 52',
      metadata: { category: MOCK_CAT_SUIVI },
      created_at: now,
      updated_at: now,
      can_edit: true,
      can_delete: true,
    },
    {
      id: 'mock-3',
      original_filename: 'Note_technique_fondations.pdf',
      mime_type: 'application/pdf',
      file_size: 890000,
      chunk_count: 12,
      content_hash: null,
      layer: 'user',
      org_id: 'mock-org',
      project_id: null,
      created_by: 'mock-user',
      app_id: 'arpet',
      storage_bucket: 'user-workspace',
      storage_path: 'mock/note.pdf',
      ingestion_level: 'user',
      processing_status: 'completed',
      processing_error: null,
      processed_at: lastWeek,
      promotion_status: 'rejected',
      promotion_requested_at: lastWeek,
      promotion_requested_by: 'mock-user',
      promotion_reviewed_at: yesterday,
      promotion_reviewed_by: 'mock-tl',
      promotion_comment: 'Document obsolète, version plus récente disponible',
      metadata: { category: MOCK_CAT_AUTRES },
      created_at: lastWeek,
      updated_at: yesterday,
      can_edit: true,
      can_delete: true,
    },
  ];
}
