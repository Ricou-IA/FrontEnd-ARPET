# Sprint 0 « Mesure » — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instrumenter le pipeline RAG (persistance des métriques par requête) et construire le banc d'évaluation (golden set + script + juge de fidélité) pour produire la baseline chiffrée v2.0.0 — sans modifier aucun comportement du RAG.

**Architecture:** Une table `rag.query_logs` alimentée en fire-and-forget par `baikal-retrieval` à chacune de ses 4 sorties (conversational, memory, agentic, fast-path) via un nouveau module `logging.ts` ; un workspace `eval/` dans le repo Baikal (Deno) qui rejoue le golden set contre l'EF déployée en parsant le SSE, calcule recall@k / MRR / critères factuels et produit des rapports comparables ; un juge LLM sans référence pour la fidélité.

**Tech Stack:** Deno 2.8 (scripts éval + EF), Supabase (Postgres 17, Edge Functions), SSE, Gemini flash-lite (juge).

**Spec :** `docs/SPEC_RAG_OPTIM_V1.md` §4 et §5/Sprint 0. **Repo cible principal :** Frontend-Baikal.

**Gates (validation Eric) :** G1 = application de la migration · G2 = déploiement de l'EF · G3 = validation du golden set.

---

## Fichiers

| Action | Chemin (repo Baikal sauf mention) | Responsabilité |
|---|---|---|
| Créer | `supabase/migrations/20260612_rag_query_logs.sql` | DDL table de logs (versionnée git, appliquée via MCP après G1) |
| Créer | `supabase/functions/baikal-retrieval/logging.ts` | Construction + insertion fire-and-forget des logs |
| Modifier | `supabase/functions/baikal-retrieval/index.ts` | 4 points d'appel + 1 sur erreur |
| Créer | `eval/config.json` | IDs réels (user, org, projets) pour rejouer les questions |
| Créer | `eval/.env.example` + `eval/.gitignore` | SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY (juge) |
| Créer | `eval/golden-set.proposed.json` → `eval/golden-set.json` | Jeu d'éval (proposé par mining, validé par Eric à G3) |
| Créer | `eval/run-eval.ts` | Banc d'essai : rejoue, mesure, rapporte |
| Créer | `eval/judge-groundedness.ts` | Juge fidélité sans référence |
| Créer | `eval/reports/` (gitignoré sauf baseline) | Rapports horodatés JSON + MD |
| Modifier | `docs/SPEC_RAG_OPTIM_V1.md` (repo ARPET) | §7 suivi : baseline renseignée |

Aucun test runner dans le repo (zéro test existant) : la vérification se fait par `deno check` (types), exécution réelle contre l'EF déployée, et contrôles SQL.

---

### Task 1: Workspace éval + résolution des IDs réels

**Files:** Create: `eval/config.json`, `eval/.env.example`, `eval/.gitignore`

- [x] **Step 1.1** Résoudre via SQL (MCP, lecture seule) : `user_id` d'Eric (`core.profiles`), `org_id`, et les `project_id` des projets actifs (Bessières, Golf Park, EHPAD Lézignan) depuis `core.projects`.
- [x] **Step 1.2** Écrire `eval/config.json` :

```json
{
  "endpoint": "https://odspcxgafcqxjzrarsqf.supabase.co/functions/v1/baikal-retrieval",
  "user_id": "<uuid résolu>",
  "org_id": "<uuid résolu>",
  "app_id": "arpet",
  "projects": { "bessieres": "<uuid>", "golfpark": "<uuid>", "ehpad": "<uuid>" },
  "defaults": { "top_k_for_recall": 10, "request_timeout_ms": 60000, "delay_between_calls_ms": 1500 }
}
```

- [x] **Step 1.3** Écrire `eval/.gitignore` (`.env`, `reports/*`, `!reports/baseline-*`) et `eval/.env.example` (`SUPABASE_URL=`, `SUPABASE_ANON_KEY=`, `GEMINI_API_KEY=`). Eric copiera vers `eval/.env` (G2).

### Task 2: Migration `rag.query_logs`

**Files:** Create: `supabase/migrations/20260612_rag_query_logs.sql`

- [x] **Step 2.1** Vérifier en SQL le nom de la colonne rôle dans `core.profiles` (attendu : `role` avec valeur `super_admin`) — conditionne la policy SELECT.
- [x] **Step 2.2** Écrire la migration (contenu complet) :

```sql
-- Sprint 0 (S0.1) — Table d'observabilité des requêtes RAG
-- Écriture : service_role uniquement (les EF utilisent la service key, RLS bypassée).
-- Lecture : super_admin via le dashboard/MCP ; aucun accès client par défaut.
CREATE TABLE IF NOT EXISTS rag.query_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  conversation_id uuid,
  user_id uuid,
  org_id uuid,
  project_id uuid,
  app_id text,
  query text NOT NULL,
  rewritten_query text,
  intent text,
  answer_format text,
  fast_path boolean,
  generation_mode text,
  model text,
  memory_hit boolean DEFAULT false,
  reranked boolean DEFAULT false,
  agentic jsonb,                       -- {triggered, iterations, timed_out, steps[]}
  counts jsonb,                        -- {total, l0, l1, children, files, sources}
  top_similarities double precision[], -- similarités des chunks retournés (ordre ranking)
  match_sources text[],                -- vector|intersection|fulltext|graphrag|child
  sources jsonb,                       -- allégé : [{file_id, document_name, page, score, layer}]
  timings jsonb,
  processing_time_ms integer,
  error text
);

CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON rag.query_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_logs_org_project ON rag.query_logs (org_id, project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_logs_intent ON rag.query_logs (intent, created_at DESC);

ALTER TABLE rag.query_logs ENABLE ROW LEVEL SECURITY;

-- Lecture réservée super_admin (adapter si Step 2.1 révèle un autre schéma de rôle)
CREATE POLICY query_logs_select_super_admin ON rag.query_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM core.profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  ));
-- Pas de policy INSERT/UPDATE/DELETE : seul service_role écrit.
```

- [x] **Step 2.3 — GATE G1** : présenter la migration à Eric → application via MCP `apply_migration` (nom `rag_query_logs_sprint0`) après accord explicite.
- [x] **Step 2.4** Vérifier : `SELECT count(*) FROM rag.query_logs;` → 0 ; structure conforme.

### Task 3: Module `logging.ts`

**Files:** Create: `supabase/functions/baikal-retrieval/logging.ts`

- [x] **Step 3.1** Écrire le module (interface contractuelle ; code complet rédigé à l'exécution — ~80 lignes) :

```ts
export interface QueryLogEntry {
  conversation_id?: string | null
  user_id: string
  org_id?: string | null
  project_id?: string | null
  app_id: string
  query: string
  rewritten_query?: string | null
  intent?: string
  answer_format?: string
  fast_path?: boolean
  generation_mode?: string
  model?: string | null
  memory_hit?: boolean
  reranked?: boolean
  agentic?: { triggered: boolean; iterations?: number; timed_out?: boolean; steps?: unknown[] } | null
  counts?: Record<string, number>
  top_similarities?: number[]
  match_sources?: string[]
  sources?: unknown[]          // allégé via slimSources()
  timings?: Record<string, number>
  processing_time_ms?: number
  error?: string | null
}

// Insertion non bloquante : ne retourne rien, n'émet jamais d'exception (catch + console.warn).
export function logQuery(supabase: Supabase, entry: QueryLogEntry): void

// Réduit SourceItem[]/ChunkResult[] au strict utile pour l'analyse (file_id, nom, page, score, layer).
export function slimSources(sources: unknown[]): unknown[]
// Extrait top_similarities + match_sources depuis ChunkResult[]
export function chunkStats(chunks: { similarity: number; match_source: string }[]): { top_similarities: number[]; match_sources: string[] }
```

- [x] **Step 3.2** `deno check supabase/functions/baikal-retrieval/logging.ts` → OK.

### Task 4: Intégration dans `index.ts` (4 sorties + erreur)

**Files:** Modify: `supabase/functions/baikal-retrieval/index.ts`

- [x] **Step 4.1** Import `logQuery, slimSources, chunkStats` ; appel `logQuery(...)` juste avant chaque `sendSSE('done')`/`controller.close()` :
  - sortie **conversational** (~l.189) : intent, fast_path=true, generation_mode='conversational', timings ;
  - sortie **memory** (~l.216) : memory_hit=true, generation_mode='memory', similarity du hit dans top_similarities ;
  - sortie **agentic** (~l.352) : decisions+counts du `metrics`, agentic{iterations, timed_out, steps}, chunkStats(allChunks), slimSources ;
  - sortie **fast path** (~l.537) : metrics complets, chunkStats(searchResult.chunks), modèle effectif, cache_reused dans timings.
- [x] **Step 4.2** Dans le `catch` du pipeline (~l.540) : `logQuery` minimal avec `error`.
- [x] **Step 4.3** `deno check supabase/functions/baikal-retrieval/index.ts` → OK. Aucun autre comportement modifié (lecture seule des objets existants).
- [x] **Step 4.4 — GATE G2** : Eric déploie (`npx supabase functions deploy baikal-retrieval`) et remplit `eval/.env`.
- [x] **Step 4.5** Smoke test : 1 requête réelle (via `run-eval.ts --smoke` ou l'UI ARPET) puis `SELECT query, intent, fast_path, generation_mode, processing_time_ms FROM rag.query_logs ORDER BY id DESC LIMIT 3;` → la ligne apparaît.

### Task 5: Mining → golden set proposé

**Files:** Create: `eval/golden-set.proposed.json` ; livrable de validation : tableau lisible pour Eric

- [x] **Step 5.1** Extraction SQL (lecture seule) des paires question/réponse réelles :

```sql
SELECT c.project_id, c.title, m.content AS question,
       a.generation_mode, a.processing_time_ms,
       a.sources, left(a.content, 400) AS answer_extract
FROM rag.messages m
JOIN rag.conversations c ON c.id = m.conversation_id
LEFT JOIN LATERAL (
  SELECT * FROM rag.messages a2
  WHERE a2.conversation_id = m.conversation_id
    AND a2.role = 'assistant' AND a2.created_at > m.created_at
  ORDER BY a2.created_at LIMIT 1
) a ON true
WHERE m.role = 'user'
ORDER BY m.created_at;
```

- [x] **Step 5.2** Dédupliquer/classer C1–C8 (cf. spec §4.2), sélectionner 25–35 questions couvrant ≥3 par classe et ≥2 projets ; pré-remplir `expected` (doc source + page) à partir des `sources` citées quand la réponse était correcte ; marquer `"à_valider"` sinon. Compléter les classes creuses (C5 suivi, C7 hors corpus, C8 verbatim) avec des questions synthétiques dérivées du corpus.
- [x] **Step 5.3** Format de chaque entrée = spec §4.3 (`id`, `classe`, `project_ref`, `question`, `conversation_context`, `expected{source_doc_contains, source_page, answer_must_contain[], answer_must_not_contain[], must_refuse}`).
- [x] **Step 5.4 — GATE G3** : tableau de validation présenté à Eric (+ ses 5–10 questions, surtout comparaisons) → corrections → renommage en `eval/golden-set.json`.

### Task 6: Script `run-eval.ts`

**Files:** Create: `eval/run-eval.ts`

- [x] **Step 6.1** Écrire le script (Deno ; code complet à l'exécution, ~300 lignes ; contrats ci-dessous) :

```ts
// Lancement : deno run -A eval/run-eval.ts [--golden eval/golden-set.json] [--classes C1,C3]
//             [--tag baseline-v2.0.0] [--baseline eval/reports/<ref>.json] [--smoke] [--judge]
// .env requis : SUPABASE_URL, SUPABASE_ANON_KEY (+ GEMINI_API_KEY si --judge)

interface EvalResult {
  id: string; classe: string; question: string
  ok_recall: boolean         // bon doc (nom contient expected.source_doc_contains, insensible casse/accents)
                             // ET page ±1 si source_page fournie — dans le top k (config.defaults.top_k_for_recall)
  rank: number | null        // rang du premier bon chunk → MRR = moyenne(1/rank)
  ok_criteria: boolean       // answer_must_contain (normalisation accents/casse/espaces) ;
                             // must_refuse → réponse sans invention (aucune source citée comme trouvée + formulation « pas trouvé »)
  violations: string[]       // must_not_contain présents, etc.
  mode: string; fast_path: boolean; agentic_iterations: number | null
  latency_ms: number; tokens_estimate: number
  answer: string; sources: SlimSource[]   // conservés dans le JSON pour le juge & l'audit
}

// SSE client : POST endpoint {query, user_id, org_id, project_id, conversation_id:null, stream:true,
//   generation_mode:'auto', enable_suggestions:false} ; Authorization: Bearer <ANON_KEY> + apikey header.
// Événements consommés : token (concat), sources (payload final), error, done.
// conversation_context d'une entrée C5 : poser d'abord la question de contexte, attendre la réponse,
//   réutiliser le conversation_id retourné pour la question de suivi.

// Rapport : eval/reports/<ISO>-<tag>.json (résultats complets) + .md (synthèse par classe :
//   recall@k %, MRR, critères %, latence p50/p95, % agentique, comparaison vs --baseline avec Δ).
```

- [x] **Step 6.2** `deno check eval/run-eval.ts` → OK ; `--smoke` (1 question) → réponse + ligne dans `query_logs` (G2 déjà passé).
- [x] **Step 6.3** Run partiel `--classes C1` → rapport généré, métriques plausibles (vérif manuelle d'1 cas).

### Task 7: Juge de fidélité `judge-groundedness.ts`

**Files:** Create: `eval/judge-groundedness.ts`

- [x] **Step 7.1** Écrire le script : entrée = rapport JSON de `run-eval.ts` (mode par défaut `--from-report <fichier>`) ; pour chaque réponse non-refus : appel `gemini-2.5-flash-lite` (temp 0, JSON forcé) avec le prompt :

```
Tu es un auditeur. Voici une RÉPONSE d'assistant et les EXTRAITS documentaires qui lui étaient fournis.
1. Découpe la réponse en affirmations factuelles.
2. Pour chacune : SUPPORTED (un extrait la soutient), UNSUPPORTED (aucun extrait), CONTRADICTED.
3. Vérifie chaque citation [Document, Page X] : le document ET la page correspondent-ils à un extrait fourni ?
Réponds en JSON : {claims:[{text, verdict, source_quote|null}], citations:[{cited, valid}],
groundedness: <0-1 = part de claims SUPPORTED>, citation_accuracy: <0-1>}
```

  Sortie : enrichit le rapport (`judge` par entrée + moyennes par classe). Mode futur `--from-logs N` (échantillon prod via `query_logs`, nécessite SERVICE_ROLE_KEY) : documenté, implémenté seulement si besoin en fin de sprint (YAGNI).
- [x] **Step 7.2** Test sur 3 entrées du run partiel → verdicts cohérents à lecture humaine.

### Task 8: Baseline v2.0.0 + clôture

- [x] **Step 8.1** Run complet : `deno run -A eval/run-eval.ts --tag baseline-v2.0.0` (golden set validé G3, EF déployée G2). *Fait le 2026-09-13 — 35/35, 0 erreur. Note : `--judge` n'existe pas dans run-eval, le juge se lance à part (`judge-groundedness.ts --from-report`) et attend `GEMINI_API_KEY` dans `eval/.env` (vide au 13/09 → juge non exécuté).*
- [x] **Step 8.2** Figer `eval/reports/baseline-v2.0.0.*` (non gitignoré) ; synthèse à Eric : scores par classe, taux agentique, latences — et lecture des premiers enseignements (confirme/infirme P2, P3, P5). *Fait — voir spec §7.1 : P2, P3, P4, P5 confirmés, P11 (pas de `page` dans `sources`) ajouté.*
- [x] **Step 8.3** Mettre à jour `docs/SPEC_RAG_OPTIM_V1.md` §7 (Sprint 0 ✅ + lien baseline). *Fait le 2026-09-13.* Commit des deux repos : à proposer à Eric.

---

## Ordre & dépendances

```
Task 1 ──► Task 2 ──► G1 ──► Task 3 ──► Task 4 ──► G2 ─┐
   │                                                    ├─► Task 6 ──► Task 7 ──► Task 8
   └──► Task 5 (mining, indépendant) ──► G3 ────────────┘
```

Tasks 2-3-4 (chaîne logging) et Task 5 (mining) sont parallélisables. Rien n'est committé/poussé sans accord ; la migration et le déploiement sont aux mains d'Eric (G1, G2).

## Self-review (fait à la rédaction)

- Couverture spec §5/Sprint 0 : S0.1→Task 2, S0.2→Tasks 3-4, S0.3→Task 5, S0.4→Tasks 1+6, S0.5→Task 7, baseline→Task 8. ✅
- Cohérence types : `QueryLogEntry` ⊇ colonnes de la migration ; `EvalResult.sources` = `slimSources()`. ✅
- Zéro comportement RAG modifié (inserts fire-and-forget uniquement). ✅
- Reste assumé à l'exécution : code complet de `run-eval.ts`/`logging.ts` (contrats figés ci-dessus), policy RLS ajustée selon Step 2.1.
