// ============================================================
// ARPET - Chat SSE Streaming
// ============================================================

import { supabase } from '../../lib/supabase'
import { mapResponse, mapSSESources, mapSSESourcesPayload, mapCrossRefAnalysis } from './chat-mapping'
import { getRagBackend, getRagEndpoint } from './chat-config'
import type {
  ChatRequest,
  RawChatResponse,
  SSEStepEvent,
  SSESourcesPayload,
  StreamOptions
} from './chat-types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// ============================================================
// PARSING SSE
// ============================================================

function processSSEEvent(
  eventType: string,
  eventData: string,
  options: StreamOptions,
  timing: { firstTokenTime: number | null; startTime: number }
): void {
  try {
    const parsed = JSON.parse(eventData)

    switch (eventType) {
      case 'step': {
        const stepEvent: SSEStepEvent = {
          step: parsed.step,
          message: parsed.message,
          details: parsed.details,
        }
        if (import.meta.env.DEV) {
          console.log(`[ChatService] Step: ${stepEvent.step} - ${stepEvent.message}`)
        }
        options.onStep?.(stepEvent)
        break
      }

      case 'token': {
        if (parsed.content) {
          if (timing.firstTokenTime === null) {
            timing.firstTokenTime = Date.now()
            const latency = timing.firstTokenTime - timing.startTime
            if (import.meta.env.DEV) {
              console.log(`[ChatService] Premier token reçu en ${latency}ms`)
            }
          }
          options.onToken(parsed.content)
        }
        break
      }

      case 'sources': {
        const sourcesPayload = parsed as SSESourcesPayload
        const mappedSources = mapSSESources(sourcesPayload.sources) || []
        const metadata = mapSSESourcesPayload(sourcesPayload)
        options.onSources?.(mappedSources, metadata)
        if (import.meta.env.DEV) {
          console.log(`[ChatService] Sources: ${mappedSources.length} documents`)
          console.log(`[ChatService] Mode: ${sourcesPayload.generation_mode_ui || sourcesPayload.generation_mode}`)
          console.log(`[ChatService] Temps total: ${sourcesPayload.processing_time_ms}ms`)
          if (sourcesPayload.cache_type) {
            console.log(`[ChatService] Cache: ${sourcesPayload.cache_type} (reused=${sourcesPayload.cache_reused})`)
          }
          if (sourcesPayload.timings) {
            console.log(`[ChatService] Timings:`, sourcesPayload.timings)
          }
        }
        break
      }

      case 'message': {
        // Mode conversationnel de brain-v3 (réponse directe sans RAG)
        if (parsed.content) {
          if (timing.firstTokenTime === null) {
            timing.firstTokenTime = Date.now()
            const latency = timing.firstTokenTime - timing.startTime
            if (import.meta.env.DEV) {
              console.log(`[ChatService] Réponse conversationnelle en ${latency}ms`)
            }
          }
          options.onToken(parsed.content)
        }
        if (parsed.conversation_id && import.meta.env.DEV) {
          console.log(`[ChatService] Conversation: ${parsed.conversation_id}`)
        }
        break
      }

      case 'analysis': {
        // Extraire cross_ref depuis le payload analysis
        const crossRef = mapCrossRefAnalysis(parsed.cross_ref)
        if (crossRef && crossRef.suggested_actions.length > 0) {
          if (import.meta.env.DEV) {
            console.log(`[ChatService] Cross-ref détecté (${crossRef.detection_method}): ${crossRef.detected_norms.join(', ')} — ${crossRef.suggested_actions.length} actions`)
          }
          options.onCrossRefActions?.(crossRef.suggested_actions)
        }
        break
      }

      case 'done': {
        if (import.meta.env.DEV) {
          console.log('[ChatService] done reçu')
        }
        break
      }

      case 'error': {
        console.error('[ChatService] Erreur SSE:', parsed.error)
        options.onError?.(new Error(parsed.error))
        break
      }
    }
  } catch (parseError) {
    console.debug('[ChatService] Parsing ignoré:', eventData.substring(0, 50))
  }
}

// ============================================================
// STREAMING
// ============================================================

export async function sendMessageStream(
  request: ChatRequest,
  options: StreamOptions
): Promise<AbortController> {
  const controller = new AbortController()
  const timing = {
    startTime: Date.now(),
    firstTokenTime: null as number | null
  }

  const {
    query,
    user_id,
    org_id = null,
    project_id = null,
    conversation_id = null,
    generation_mode = 'auto',
    intent,
    rewritten_query,
    detected_documents,
    cross_ref_mode,
    cross_ref_context,
  } = request

  if (!query?.trim()) {
    options.onError?.(new Error('La question est requise'))
    options.onComplete?.()
    return controller
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[ChatService] Variables d\'environnement manquantes')
    options.onError?.(new Error('Configuration manquante'))
    options.onComplete?.()
    return controller
  }

  // Résoudre le backend au moment de l'appel (toggle A/B live)
  const activeBackend = getRagBackend()
  const activeEndpoint = getRagEndpoint()

  if (import.meta.env.DEV) {
    console.log(`[ChatService] Streaming SSE vers ${activeEndpoint} (backend=${activeBackend})`)
  }

  const body: Record<string, unknown> = {
    query: query.trim(),
    user_id,
    org_id,
    project_id,
    conversation_id,
    stream: true,
  }

  if (activeBackend === 'retrieval') {
    // baikal-retrieval attend toujours generation_mode (default 'auto')
    body.generation_mode = generation_mode || 'auto'
  } else {
    // brain-v3 : n'envoyer que si explicitement choisi
    if (generation_mode && generation_mode !== 'auto') {
      body.generation_mode = generation_mode
    }
  }
  if (intent) body.intent = intent
  if (rewritten_query) body.rewritten_query = rewritten_query
  if (detected_documents?.length) body.detected_documents = detected_documents
  if (cross_ref_mode) body.cross_ref_mode = cross_ref_mode
  if (cross_ref_context) body.cross_ref_context = cross_ref_context

  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData?.session?.access_token

  // IIFE async pour le streaming
  ;(async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/${activeEndpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      )

      const fetchTime = Date.now() - timing.startTime
      if (import.meta.env.DEV) {
        console.log(`[ChatService] Connexion établie en ${fetchTime}ms`)
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur ${response.status}: ${errorText}`)
      }

      const contentType = response.headers.get('content-type')

      if (!contentType?.includes('text/event-stream')) {
        if (import.meta.env.DEV) {
          console.log('[ChatService] Réponse non-SSE, fallback JSON')
        }
        const data = await response.json()
        const mappedData = mapResponse(data as RawChatResponse)
        options.onToken(mappedData.response)
        options.onSources?.(mappedData.sources || [], mappedData)
        options.onComplete?.()
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Impossible de lire le stream')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let currentEventType: string | null = null

      // Boucle de lecture
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          if (import.meta.env.DEV) {
            console.log('[ChatService] Stream terminé')
          }
          break
        }

        // Décoder le chunk reçu
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        // Traiter ligne par ligne
        const lines = buffer.split('\n')

        // Garder la dernière ligne (potentiellement incomplète) dans le buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()

          // Ligne vide = fin d'événement, reset
          if (trimmedLine === '') {
            currentEventType = null
            continue
          }

          // Ligne "event: xxx"
          if (trimmedLine.startsWith('event:')) {
            currentEventType = trimmedLine.substring(6).trim()
            continue
          }

          // Ligne "data: xxx"
          if (trimmedLine.startsWith('data:') && currentEventType) {
            const eventData = trimmedLine.substring(5).trim()
            processSSEEvent(currentEventType, eventData, options, timing)
          }
        }
      }

      // Traiter le reste du buffer si non vide
      if (buffer.trim()) {
        const remainingLines = buffer.split('\n')
        for (const line of remainingLines) {
          const trimmedLine = line.trim()
          if (trimmedLine.startsWith('data:') && currentEventType) {
            const eventData = trimmedLine.substring(5).trim()
            processSSEEvent(currentEventType, eventData, options, timing)
          }
        }
      }

      const totalTime = Date.now() - timing.startTime
      if (import.meta.env.DEV) {
        console.log(`[ChatService] Durée totale: ${totalTime}ms`)
      }

      options.onComplete?.()

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        if (import.meta.env.DEV) {
          console.log('[ChatService] Stream annulé')
        }
      } else {
        console.error('[ChatService] Erreur streaming:', error)
        options.onError?.(error as Error)
      }
      options.onComplete?.()
    }
  })()

  return controller
}
