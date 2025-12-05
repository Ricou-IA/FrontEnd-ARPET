const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  
  function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  function errorResponse(message: string, status = 500): Response {
    return jsonResponse({ error: message, status: 'error' }, status);
  }
  
  const SYSTEM_PROMPT = `Tu es un routeur. Reponds UNIQUEMENT en JSON valide:
  {"destination": "BIBLIOTHECAIRE", "reasoning": "explication"}
  ou
  {"destination": "ANALYSTE", "reasoning": "explication"}
  
  BIBLIOTHECAIRE: questions texte, normes, documents
  ANALYSTE: calculs, donnees, statistiques`;
  
  Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }
  
    if (req.method !== 'POST') {
      return errorResponse('POST only', 405);
    }
  
    try {
      const body = await req.json();
      const query = body.query;
  
      if (!query) {
        return errorResponse('query required', 400);
      }
  
      const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openaiApiKey) {
        return errorResponse('OPENAI_API_KEY missing', 500);
      }
  
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + openaiApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0,
          max_tokens: 100,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: query }
          ],
        }),
      });
  
      if (!response.ok) {
        return errorResponse("OpenAI error: " + response.status, 500);
      }
  
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
  
      let decision;
      try {
        decision = JSON.parse(content.trim());
      } catch {
        decision = { destination: "BIBLIOTHECAIRE", reasoning: "fallback" };
      }
  
      return jsonResponse({
        destination: decision.destination,
        reasoning: decision.reasoning,
        status: 'success',
      });
  
    } catch (error) {
      return errorResponse(String(error), 500);
    }
  });
  