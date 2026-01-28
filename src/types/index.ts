// ============================================================
// ARPET - Types unifiés (Barrel file)
// Réexporte tous les types pour rétro-compatibilité
// ============================================================

// User & Auth
export type { User, Profile } from './user.types';

// Organization & Projects
export type { Organization, Project } from './organization.types';

// QA Memory
export type { AuthorityLabel, SourceType, QAMemory } from './qa-memory.types';

// Chat & Messages
export type {
  MessageRole,
  KnowledgeType,
  AgentSource,
  GenerationMode,
  MessageSource,
  VoteContext,
  Message,
  LibrarianResponse,
  VoteResult,
} from './chat.types';

// Documents
export type {
  DocumentLayer,
  ProcessingStatus,
  PromotionStatus,
  DocumentCategoryConfig,
  SourceFile,
  SourceMeeting,
} from './document.types';
export {
  LAYER_CONFIG,
  getFileIcon,
  formatFileSize,
  getPromotionBadge,
  isEmojiIcon,
} from './document.types';

// Viewer
export type { ViewerDocument, ViewerState } from './viewer.types';
export { isViewableFile, getViewerType } from './viewer.types';

// Conversations
export type { SavedConversation, SavedConversationCreate } from './conversation.types';

// Meetings
export type {
  MeetingStep,
  MeetingProcessingStatus,
  MeetingActionItem,
  MeetingCR,
  MeetingPrepareData,
  ProcessAudioResponse,
} from './meeting.types';
export {
  MEETING_PROCESSING_LABELS,
  formatMeetingDuration,
  generateMeetingDefaultTitle,
} from './meeting.types';

// Helpers génériques
export {
  isValidatedSource,
  getAuthorityBadge,
  getKnowledgeTypeIcon,
  formatScore,
} from './helpers';
