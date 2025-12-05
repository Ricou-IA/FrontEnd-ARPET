import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_MATCH_THRESHOLD = 0.3
const DEFAULT_MATCH_COUNT = 10
const MAX_CONTEXT_LENGTH = 12000
const EMBEDDING_MODEL = 'text-embedding-ada-002'
const LLM_MODEL = 'gpt-4o-mini'
const LLM_TEMPERATURE = 0.3
const LLM_MAX_TOKENS = 2048

const SYSTEM_PROMPT = `Tu es ARPET, un assistant expert pour les conducteurs de travaux BTP.
Tu réponds aux questions en te basant UNIQUEMENT sur le contexte documentaire fourni.

RÈGLES STRICTES:
1. Base tes réponses EXCLUSIVEMENT sur le contexte fourni ci-dessous.
2. Si le contexte ne contient pas l'information demandée, dis-le clairement : "Je n'ai pas trouvé cette information dans les documents disponibles."
3. Ne jamais inventer d'informations non présentes dans le contexte.
4. Cite les sources pertinentes quand c'est possible (nom du document, section).
5. Réponds en français de manière claire, professionnelle et concise.
6. Pour les questions techniques BTP, privilégie les références aux normes DTU, CCTP ou réglementations citées.

FORMAT DE RÉPONSE:
- Commence par répondre directement à la question
- Si pertinent, cite les documents sources entre parenthèses
- Termine par une note si des informations complémentaires pourraient être utiles`

interface RequestBody {
  query: string
  user_id: string              // REQUIS: pour récupérer le vertical_id via match_documents_v3
  org_id?: string
  project_id?: string
  vertical_id?: string         // Gardé pour compatibilité mais non utilisé
  match_threshold?: number
  match_count?: number
}

interface DocumentMatch {
  id: string
  content: string
  metadata: Record<string, unknown>
  similarity: number
}

interface Source {
  document_id: string
  document_name: string
  chunk_id: string
  score: number
  content_preview: string
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(message: string, status = 500): Response {
  console.error(`[baikal-librarian] Erreur: ${message}`)
  return jsonResponse({ 
    error: message, 
    status: 'error',
    response: null,
    sources: [] 
  }, status)
}

function truncateContext(documents: DocumentMatch[], maxLength: number): string {
  let context = ''
  let currentLength = 0
  
  for (const doc of documents) {
    const docText = `\n---\n[Document: ${doc.metadata?.filename || doc.metadata?.source_file || 'inconnu'}]\n${doc.content}\n`
    
    if (currentLength + docText.length > maxLength) {
      const remainingSpace = maxLength - currentLength
      if (remainingSpace > 100) {
        context += docText.substring(0, remainingSpace) + '...[tronqué]'
      }
      break
    }
    
    context += docText
    currentLength += docText.length
  }
  
  return context
}

function extractSources(documents: DocumentMatch[]): Source[] {
  return documents.map(doc => ({
    document_id: doc.metadata?.document_id as string || doc.id,
    document_name: doc.metadata?.filename as string || doc.metadata?.source_file as string || 'Document inconnu',
    chunk_id: doc.id,
    score: Math.round(doc.similarity * 100) / 100,
    content_preview: doc.content.substring(0, 150) + (doc.content.length > 150 ? '...' : '')
  }))
}

serve(async (req: Request): Promise<Response> => {
  const startTime = Date.now()
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('Méthode non autorisée. Utilisez POST.', 405)
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!OPENAI_API_KEY) {
      return errorResponse('OPENAI_API_KEY manquant dans les secrets', 500)
    }
    if (!SUPABASE_URL) {
      return errorResponse('SUPABASE_URL manquant', 500)
    }
    if (!SUPABASE_SERVICE_KEY) {
      return errorResponse('SUPABASE_SERVICE_ROLE_KEY manquant', 500)
    }

    const body: RequestBody = await req.json()
    const { 
      query, 
      user_id,
      org_id, 
      project_id,
      match_threshold = DEFAULT_MATCH_THRESHOLD,
      match_count = DEFAULT_MATCH_COUNT 
    } = body

    // Validation
    if (!query || query.trim().length === 0) {
      return errorResponse('Le champ "query" est requis', 400)
    }

    if (!user_id || user_id.trim().length === 0) {
      return errorResponse('Le champ "user_id" est requis pour la recherche documentaire', 400)
    }

    console.log(`[baikal-librarian] Requête: "${query.substring(0, 100)}..."`)
    console.log(`[baikal-librarian] user_id: ${user_id}`)

    // 1. Générer l'embedding
    console.log('[baikal-librarian] Génération de l\'embedding...')
    
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: query.trim(),
      }),
    })

    if (!embeddingResponse.ok) {
      const errorData = await embeddingResponse.json()
      console.error('[baikal-librarian] OpenAI Embedding Error:', errorData)
      return errorResponse(`Erreur OpenAI Embedding: ${errorData.error?.message || 'Erreur inconnue'}`, 500)
    }

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data[0].embedding
    console.log('[baikal-librarian] Embedding généré, dimensions:', queryEmbedding.length)

    // 2. Recherche vectorielle avec match_documents_v3 (récupère vertical_id depuis profiles)
    console.log('[baikal-librarian] Recherche de documents (vertical récupéré depuis profil user)...')
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    const rpcParams: Record<string, unknown> = {
      query_embedding: queryEmbedding,
      p_user_id: user_id,                    // La fonction SQL récupère le vertical_id depuis profiles
      match_threshold: match_threshold,
      match_count: match_count,
    }

    // Filtres optionnels
    if (org_id) {
      rpcParams.filter_org = org_id
    }
    if (project_id) {
      rpcParams.filter_project = project_id
    }

    console.log('[baikal-librarian] Appel RPC match_documents_v3...')

    const { data: documents, error: searchError } = await supabase
      .rpc('match_documents_v3', rpcParams)

    if (searchError) {
      console.error('[baikal-librarian] Erreur RPC:', searchError)
      return errorResponse(`Erreur recherche documents: ${searchError.message}`, 500)
    }

    const matchedDocs = documents as DocumentMatch[] || []
    console.log(`[baikal-librarian] ${matchedDocs.length} documents trouvés`)

    // 3. Si aucun document trouvé
    if (matchedDocs.length === 0) {
      return jsonResponse({
        response: "Je n'ai trouvé aucun document pertinent pour répondre à votre question. Pouvez-vous reformuler ou préciser votre demande ?",
        sources: [],
        knowledge_type: 'none',
        status: 'success',
        processing_time_ms: Date.now() - startTime,
        documents_found: 0
      })
    }

    // 4. Construire le contexte et les sources
    const context = truncateContext(matchedDocs, MAX_CONTEXT_LENGTH)
    const sources = extractSources(matchedDocs)

    let knowledgeType = 'shared'
    if (project_id && matchedDocs.some(d => {
      const projects = d.metadata?.target_projects as string[] | undefined
      return projects && projects.includes(project_id)
    })) {
      knowledgeType = 'project'
    } else if (org_id && matchedDocs.some(d => d.metadata?.org_id === org_id)) {
      knowledgeType = 'organization'
    }

    // 5. Générer la réponse avec le LLM
    console.log('[baikal-librarian] Génération de la réponse...')

    const userPrompt = `CONTEXTE DOCUMENTAIRE:
${context}

QUESTION DE L'UTILISATEUR:
${query}

Réponds à la question en te basant uniquement sur le contexte fourni.`

    const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: LLM_TEMPERATURE,
        max_tokens: LLM_MAX_TOKENS,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
      }),
    })

    if (!llmResponse.ok) {
      const errorData = await llmResponse.json()
      console.error('[baikal-librarian] OpenAI LLM Error:', errorData)
      return errorResponse(`Erreur génération réponse: ${errorData.error?.message || 'Erreur inconnue'}`, 500)
    }

    const llmData = await llmResponse.json()
    const answer = llmData.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse."

    const processingTime = Date.now() - startTime
    console.log(`[baikal-librarian] Réponse générée en ${processingTime}ms`)

    return jsonResponse({
      response: answer,
      sources: sources,
      knowledge_type: knowledgeType,
      status: 'success',
      processing_time_ms: processingTime,
      documents_found: matchedDocs.length,
      model: LLM_MODEL,
      embedding_model: EMBEDDING_MODEL
    })

  } catch (error) {
    console.error('[baikal-librarian] Erreur non gérée:', error)
    return errorResponse(String(error), 500)
  }
})
