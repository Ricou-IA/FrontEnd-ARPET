// ============================================================
// ARPET - Chat Service
// Version: 4.0.0 - V3 Production (sans toggle)
// Re-export depuis modules éclatés (rétro-compatibilité)
// ============================================================

export {
  sendMessage,
  sendMessageStream,
} from './chat'

export type {
  ChatRequest,
  ChatResponse,
  ChatResult,
  SSEStepEvent,
  SSESourcesPayload,
  StreamOptions,
  OnTokenCallback,
  OnStepCallback,
  OnSourcesCallback,
  OnCrossRefActionsCallback,
  OnErrorCallback,
  CrossRefAction,
  CrossRefMode,
} from './chat'
