// ============================================================
// ARPET - Types unifies (Barrel file)
// Reexporte tous les types pour retro-compatibilite
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

// Meetings - V3 Types
export type {
  // Source types
  MeetingSourceType,
  // Status types
  MeetingStep,
  MeetingProcessingStatus,
  MeetingExtractionStatus,
  // Participants
  MeetingParticipantEnriched,
  // Items
  MeetingItemType,
  MeetingItemStatus,
  MeetingItem,
  // Legacy types (backward compat)
  MeetingActionItem,
  MeetingCR,
  // Prepare data
  MeetingPrepareData,
  // Memo
  MemoExtraction,
  // Meeting DB record
  Meeting,
  // API Responses
  TranscribeResponse,
  ExtractResponse,
  ProcessAudioResponse,
} from './meeting.types';

export {
  // UI Config
  MEETING_PROCESSING_LABELS,
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_ICONS,
  ACCEPTED_AUDIO_FORMATS,
  ACCEPTED_AUDIO_EXTENSIONS,
  // Helpers
  formatMeetingDuration,
  generateMeetingDefaultTitle,
  generateMemoDefaultTitle,
  isAcceptedAudioFormat,
  isMemoType,
  needsDiarization,
} from './meeting.types';

// Meeting Documents (generated)
export type {
  GeneratedDocType,
  GenerateDocRequest,
  GeneratedDocResponse,
  ProjectLot,
} from './meeting-document.types';
export { GENERATED_DOC_CONFIG } from './meeting-document.types';

// Intervenants
export type {
  Intervenant,
  ProjetIntervenant,
  IntervenantWithProjectRole,
  CreateIntervenantInput,
  LinkIntervenantInput,
} from './intervenant.types';

// Helpers generiques
export {
  isValidatedSource,
  getAuthorityBadge,
  getKnowledgeTypeIcon,
  formatScore,
} from './helpers';
