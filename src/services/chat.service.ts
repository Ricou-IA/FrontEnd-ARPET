// ============================================================
// ARPET - Chat Service
// Version: 5.0.0 - Suggestions contextuelles (sans cross-ref)
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
  SuggestionItem,
  OnTokenCallback,
  OnStepCallback,
  OnSourcesCallback,
  OnSuggestionsCallback,
  OnErrorCallback,
} from './chat'
