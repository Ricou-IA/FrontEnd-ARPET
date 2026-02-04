// ============================================================
// ARPET - Chat Service (barrel file)
// Version: 6.0.0 - Endpoint fixe (retrieval)
// ============================================================

// Config (endpoint fixe)
export {
  getRagBackend,
  getRagEndpoint,
  type RagBackend,
} from './chat-config'

// Legacy compat
export { RAG_ENDPOINT } from './chat-types'

// Types
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
  CrossRefMode,
  CrossRefAction,
  CrossRefAnalysis,
} from './chat-types'

// Request (appel classique)
export { sendMessage } from './chat-request'

// SSE Streaming
export { sendMessageStream } from './chat-sse'
