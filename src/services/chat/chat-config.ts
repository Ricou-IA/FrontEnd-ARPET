// ============================================================
// ARPET - Chat Config (RAG Endpoint — fixe)
// ============================================================
// Endpoint unique : baikal-retrieval v1.4.0 (validé A/B testing)
// Les fonctions getRagBackend() / getRagEndpoint() sont conservées
// pour rétro-compatibilité (utilisées par chat-sse.ts, chat-request.ts).
// ============================================================

export type RagBackend = 'retrieval'

const RAG_ENDPOINT = 'baikal-retrieval'

export function getRagBackend(): RagBackend {
  return 'retrieval'
}

export function getRagEndpoint(): string {
  return RAG_ENDPOINT
}
