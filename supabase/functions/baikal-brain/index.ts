// 1. IMPORTS (Avec le FIX "?external=langsmith" pour éviter le crash)
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { ChatOpenAI } from "https://esm.sh/@langchain/openai@0.0.14?external=langsmith";
import { HumanMessage, SystemMessage } from "https://esm.sh/@langchain/core@0.1.23/messages?external=langsmith";
import { z } from "https://esm.sh/zod@3.22.4";

// 2. CONFIGURATION CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 3. SCHEMA DE RÉPONSE DU ROUTEUR
const routeSchema = z.object({
  destination: z.enum(["BIBLIOTHECAIRE", "ANALYSTE"]).describe("L'agent le plus adapté"),
  reasoning: z.string().describe("Courte justification du choix"),
});

// 4. DÉMARRAGE DU SERVEUR EDGE
Deno.serve(async (req) => {
  // Gestion du Preflight CORS (Pour que le navigateur accepte la requête)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Vérifier que le body est valide
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      throw new Error("Le body de la requête n'est pas un JSON valide.");
    }

    // Récupération du body (On accepte query + filters même si on utilise que query pour l'instant)
    const { query, filters } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      throw new Error("La requête (query) est manquante ou invalide dans le body JSON.");
    }

    // Logger les filters pour debug (sera utilisé plus tard)
    if (filters) {
      console.log(`[Router] Filters reçus:`, filters);
    }

    // Initialisation du modèle (GPT-4o-mini)
    const routerLLM = new ChatOpenAI({
      openAIApiKey: Deno.env.get("OPENAI_API_KEY"),
      modelName: "gpt-4o-mini",
      temperature: 0,
    });

    // Configuration de la sortie structurée (JSON forcé)
    const routerChain = routerLLM.withStructuredOutput(routeSchema);

    // Prompt Système
    const systemPrompt = `
    Tu es le Routeur du système BAÏKAL. Analyse la requête et oriente-la :
    - BIBLIOTHECAIRE : Questions textuelles, connaissances générales, recherche de documents RAG (PDF/Doc), "Qui", "Quoi", "Comment".
    - ANALYSTE : Questions de calcul, mathématiques, analyse de données structurées, fichiers CSV, génération de code Python.
    `;

    console.log(`[Router] Analyse de la requête : "${query}"`);

    // Exécution du modèle
    const decision = await routerChain.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(query),
    ]);

    console.log(`[Router] Décision : ${decision.destination}`);

    // Construction de la réponse pour le Frontend
    const responsePayload = {
      ...decision, // contient destination et reasoning
      status: "success",
      message: `Redirection vers l'agent ${decision.destination}`
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Erreur Backend :", error);
    
    // Gérer les erreurs de manière sécurisée
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : 'Une erreur inattendue est survenue';
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      status: "error"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
