# SPEC_RAG_OPTIM_V1 — Optimisation du pipeline RAG ARPET/BAIKAL

> **Statut** : spec validée (audit + plan en 5 sprints approuvés le 2026-06-12). **Sprint 0 terminé le 2026-09-13** (baseline v2.0.0 figée). Prochain : exécution du Sprint 1 (plan écrit le 2026-09-13).
> **Périmètre** : Edge Function `baikal-retrieval` (repo **Frontend-Baikal**, `supabase/functions/baikal-retrieval/`), fonction SQL `rag.match_documents_v14` → `v15`, corpus `rag.documents`, frontend chat (repo **Frontend-ARPET**, `src/services/chat/` + composants)
> **Règles** : Claude Code modifie le code, **Eric déploie** les Edge Functions ; toute migration SQL est soumise avant application ; rien n'est poussé sur GitHub sans accord ; chaque sprint se conclut par un passage du banc d'éval.

---

## 1. Contexte et objectif

ARPET est jugé « valable mais pas assez performant ». Les deux symptômes prioritaires exprimés :

1. **Pertinence** : réponses à côté ou incomplètes (la recherche ne remonte pas les bons passages).
2. **Multi-docs** : comparaisons / croisements entre documents (CCAP vs CCTP, CCTP vs norme) décevants.

Contraintes validées :

- **Liberté utilisateur intacte** : l'évaluation instrumente le système, elle ne restreint jamais la nature des questions.
- **Budget API accepté** : reranker Cohere (~1 $/1000 requêtes) + modèle de génération plus capable.
- **Ré-ingestion n8n possible facilement** (FLUX 3 v5.1.0 opérationnel).
- Latence et sourçage ne sont pas les douleurs n°1 — ils sont traités quand ils servent la qualité (ex. budget agentique).

## 2. État des lieux (constaté le 2026-06-12)

### 2.1 Architecture réelle — `baikal-retrieval` v2.0.0 « Agentic RAG »

> ⚠️ La section « État courant » du CLAUDE.md ARPET décrit février 2026 et est périmée.

```
Requête → Phase A (fast path, AUCUN appel LLM d'analyse)
  ├── loadConfig (DB config.agent_prompts) ‖ —
  ├── getAgentContext ‖ generateEmbedding (text-embedding-3-small, requête BRUTE)
  ├── buildFallbackAnalysis (heuristique mots-clés : intent, rewritten_query = query)
  ├── QA memory (seuil 0.85, trust ≥ 3 ou expert_faq) → réponse directe si hit
  ├── executeSearch → rag.match_documents_v14 (hybride vector+FTS+GraphRAG, RRF k=60,
  │     boost intersection ×1.5, hiérarchie L0/L1 par intent)
  ├── rerankIfEnabled (Cohere — DÉSACTIVÉ)
  └── Quality gate : chunks ≥ 3 ET avg(similarity) ≥ 0.45 ?
        ├── OUI → fast path : mode chunks (gpt-4o-mini) ou gemini full-doc
        │         (gemini-2.5-flash-lite ; comparison → gemini-2.5-pro, files ≤ 450 pages,
        │          upload Google Files + cache global)
        └── NON → Phase B agentique : Gemini 2.5 Flash, ReAct ≤ 3 itérations, budget 8s
                  (outils : search_documents, list_project_files, search_in_file)
```

Config live (DB `config.agent_prompts`, `librarian_v3`, app_id=arpet) : factual 12 chunks / seuil 0.42 ; synthesis 18 / 0.30 ; comparison 14 / 0.35 ; citation 8 / 0.55 ; max_context 30 000 chars ; features (reranking, adaptive threshold) absents de la DB → fallbacks (désactivés).

### 2.2 Corpus (`rag.documents`, status=approved)

| Couche | Chunks | Dont L0 | QQOQCCP enrichis | Taille moyenne | Pipeline |
|---|---|---|---|---|---|
| app (CCAG.pdf, Norme NFP03-001.pdf) | 1 071 | 227 (+24 chunks niveaux 2/3 incohérents) | **0 %** | 372–641 chars | **legacy** (2026-02-02) |
| project (Bessières, Golf Park, EHPAD Lézignan, lots PE06, CR/PV chantier…) | 2 629 | 464 | **54 %** (326 L0 / 1 098 L1) | 1 074–2 244 chars | v5.x mixte |

Docs projet sans aucun L0 ni enrichissement (pipeline de janvier) : `PGC-Bessières.pdf`, `DBC - BESSIERES OPH 31.pdf`, `Bessières AE DBC Signé.pdf`, `RICT-DCE.pdf` (~429 chunks).

Les chunks récents incluent un en-tête contextuel embeddé (`[Document: …] [Page N] [Chemin: …] [Type: …]`) — bonne pratique « contextual retrieval » déjà en place. Le JSONB `qqoqccp` est riche (ouvrages, matériaux, lots, normes, dimensions, localisations) avec colonnes dénormalisées indexées (`qui_lots`, `comment_normes`, `quand_phase`…).

### 2.3 Usage

75 conversations / 713 messages (janv.–mars 2026), 13 entrées `rag.qa_memory`, votes 👍/👎 branchés (frontend → EF `baikal-vote`). Embeddings 1536d, index HNSW (m=16, ef_construction=64) + GIN sur `fts`.

## 3. Problèmes identifiés (audit)

| # | Problème | Localisation | Impact | Symptôme |
|---|---|---|---|---|
| P1 | **Aucune éval, métriques non persistées** : l'objet `metrics` (timings, counts, décisions) part en SSE et n'est stocké nulle part | `index.ts`, `context.ts` (`addMessage`) | Tuning à l'aveugle, régressions invisibles | tous |
| P2 | **FTS quasi mort** : `websearch_to_tsquery('french', query_text)` sur la question complète = AND de tous les termes → ~0 match sur question naturelle → hybride dégénéré en vector-only, boost intersection inopérant | `match_documents_v14` (étape 2) | Rappel dégradé | pertinence |
| P3 | **Enfants L1 coupés par le LIMIT** : `ORDER BY primary-first … LIMIT match_count` → si ≥ match_count primaires, zéro enfant retourné ; synthesis/comparison (recherche L0) génèrent depuis des résumés L0 que le prompt interdit de sourcer | `match_documents_v14` (étapes 7–9, SELECT final) | Synthèses/comparaisons sans texte original | pertinence + multi-docs |
| P4 | **Pas de réécriture de requête** : `analyzeQuery` (brain LLM, anaphores) n'est plus appelé en v2 ; les questions de suivi sont embeddées brutes | `index.ts` (n'importe que `buildFallbackAnalysis`), `routing/analyzer.ts` | Follow-ups faibles, agentique déclenché pour compenser | pertinence |
| P5 | **Quality gate bruité** : moyenne de `similarity` d'échelles hétérogènes (cosine vector ~0.4–0.7, ts_rank FTS ~0.0x, ratio GraphRAG 0–1) ; citation (seuil 0.55) donne souvent < 3 chunks | `agentic/orchestrator.ts` (`shouldTriggerAgentic`) | Agentique sur/sous-déclenché | latence + pertinence |
| P6 | **Boucle agentique** : (a) réponse texte de l'itération k jetée puis re-générée en streaming (double appel LLM) ; (b) budget 8s décompté depuis le début de la requête (Phase A consomme déjà 2–4s) → comparaisons interrompues à mi-parcours ; (c) frontend n'affiche aucun event `agent_*` | `orchestrator.ts` (l.113–118, l.169), `index.ts` (l.295–298), `chat-sse.ts` (ARPET) | Comparaisons incomplètes, coût ×2, silence perçu 8–12s | multi-docs |
| P7 | **gpt-4o-mini hardcodé** pour la génération chunks : le parser ignore la DB (`llm_model: FALLBACK_LIBRARIAN.llm_model`) | `config.ts` (l.338), `generation/openai.ts` | Rédaction/raisonnement faibles, non configurable | pertinence + multi-docs |
| P8 | **Corpus 2 vitesses** : couche app 100 % legacy (chunks ~640 chars, 0 QQOQCCP, niveaux 2/3), 4 docs projet sans L0 ; `include_app_layer=true` par défaut → ces chunks concourent dans le même top-k | corpus + `index.ts` defaults | Bruit, normes inexploitables | pertinence |
| P9 | **QQOQCCP inexploité au retrieval** : entités (normes, lots, localisations) ni dans le `fts` ni en filtre dans v14 ; seul le cross-ref implicite lit `comment_normes` des résultats | `match_documents_v14`, pipeline ingestion | Recherche par norme/lot aléatoire | pertinence + multi-docs |
| P10 | **Pas de reranker + entonnoir étroit** : pool vector limité à 2×match_count avec seuil dur à l'entrée ; Cohere codé mais désactivé | `match_documents_v14` (LIMIT), `search/reranker.ts`, features DB | Précision top-k sous-optimale | pertinence |

## 4. Dispositif d'évaluation à deux étages (Sprint 0)

### 4.1 Principe

Les questions des utilisateurs sont infinies, mais les **situations de retrieval** sont finies. On échantillonne les situations (étage 1, fermé, rejouable) et on observe la production réelle sans référence attendue (étage 2, ouvert). L'éval ne modifie ni ne contraint jamais le comportement du RAG.

### 4.2 Taxonomie des situations

| Classe | Situation | Exemple |
|---|---|---|
| C1 | Fait précis dans un chunk | « Quel est le délai global des travaux ? » |
| C2 | Info éclatée dans un document | « Quelles sont les prescriptions acoustiques ? » |
| C3 | Croisement entre 2+ documents | « Compare la garantie entre le CCAP et la NFP 03-001 » |
| C4 | Synthèse large (section/lot/document) | « Résume le lot 6 menuiseries extérieures » |
| C5 | Suivi avec référence implicite | « et pour le lot 3 ? » |
| C6 | Mention de norme / code | « Que dit le CCTP sur la NF EN 1154 ? » |
| C7 | Hors corpus (doit dire « pas trouvé » sans inventer) | « Recette de la tarte aux pommes » |
| C8 | Citation exacte / verbatim | « Cite l'article sur les pénalités de retard » |

### 4.3 Étage 1 — Golden set

- **Fichier** : `eval/golden-set.json` (repo Frontend-Baikal).
- **Taille cible** : 30–50 questions, ≥ 3 par classe, réparties sur ≥ 2 projets réels.
- **Constitution** : Claude Code mine `rag.messages` (713 messages réels), classe et pré-remplit les critères (doc source, page, faits) ; Eric valide/corrige (~30–60 min) et ajoute 5–10 questions à lui (priorité : comparaisons ratées).
- **Format d'une entrée** (pas de « réponse en or », des critères vérifiables) :

```json
{
  "id": "C1-003",
  "classe": "C1",
  "project_ref": "bessieres",
  "question": "Quel est le délai global d'exécution des travaux ?",
  "conversation_context": null,
  "expected": {
    "source_doc_contains": "CCAP",
    "source_page": 12,
    "answer_must_contain": ["9 mois"],
    "answer_must_not_contain": [],
    "must_refuse": false
  }
}
```

- **Jeu vivant** : toute question de prod en échec (étage 2) devient candidate à l'entrée dans le set. Versionné en git.

### 4.4 Métriques étage 1

| Métrique | Question à laquelle elle répond | Besoin |
|---|---|---|
| **recall@k** (chunk du bon doc/page dans les sources retournées) | « Le retrieval a-t-il trouvé ? » | doc+page seulement |
| **MRR** (rang du premier bon chunk) | « À quel rang ? » | doc+page |
| **Critères factuels** (`answer_must_contain` / `must_not_contain` / `must_refuse`) | « La réponse contient-elle le fait, sans invention ? » | critères |
| **Juge comparaison** (LLM) — pour C3 : les deux documents sont-ils traités et cités ? | « La comparaison est-elle réellement croisée ? » | critères légers |
| Latence, mode emprunté (fast/agentic/gemini/memory), itérations | « À quel coût ? » | aucun |

### 4.5 Étage 2 — Observabilité production (sans référence)

- **Table `rag.query_logs`** (nouvelle, migration soumise avant application) — alimentée en fin de pipeline par `baikal-retrieval` (insert fire-and-forget, non bloquant) :
  - identifiants : `created_at`, `conversation_id`, `user_id`, `org_id`, `project_id`, `app_id`
  - requête : `query`, `rewritten_query`, `intent`, `answer_format`
  - décisions : `fast_path`, `generation_mode`, `model`, `agentic` (jsonb : triggered/iterations/timed_out/steps), `memory_hit`, `reranked`
  - résultats : `counts` (jsonb : total/l0/l1/children/files), `top_similarities` (float[]), `match_sources` (text[]), `sources` (jsonb allégé : file_id, page, score)
  - perfs : `timings` (jsonb), `processing_time_ms`
  - RLS : écriture service_role uniquement ; lecture super_admin.
- **Juge de fidélité sans référence** (échantillonné) : un LLM économique reçoit (réponse + chunks remontés) et vérifie que chaque affirmation est soutenue par les chunks et que les citations [Doc, Page] correspondent à des chunks réellement fournis. Fonctionne sur n'importe quelle question — c'est lui qui couvre « l'ouverture infinie ».
- **Votes utilisateurs** 👍/👎 (déjà en place) croisés avec `query_logs`.
- **Boucle** : échec étage 2 → candidat golden set étage 1.

### 4.6 Script d'éval

- `eval/run-eval.ts` (repo Baikal, Deno) : rejoue le golden set contre l'EF `baikal-retrieval` (déployée, clé service en `.env` local), collecte SSE (sources + réponse), calcule les métriques, produit un rapport markdown + JSON horodaté dans `eval/reports/`.
- Lancement PowerShell : `deno run -A eval/run-eval.ts [--classes C1,C3] [--baseline <fichier>]` avec comparaison automatique au dernier rapport (diff par classe).
- **Baseline obligatoire** : un run complet AVANT toute modification (fin du Sprint 0).

## 5. Sprints

### Sprint 0 — Mesure (préalable à tout)

| Tâche | Détail | Fichiers/objets |
|---|---|---|
| S0.1 | Migration `rag.query_logs` (cf. 4.5) | migration SQL (soumise avant application) |
| S0.2 | Persistance des metrics en fin de pipeline (fast path, agentique, conversationnel, memory) | `index.ts`, nouveau `logging.ts` |
| S0.3 | Mining de `rag.messages` → proposition de golden set classé → validation Eric + ses 5–10 questions | `eval/golden-set.json` |
| S0.4 | Script d'éval + premier rapport **baseline v2.0.0** | `eval/run-eval.ts` |
| S0.5 | Juge fidélité sans référence (prompt + script d'échantillonnage sur query_logs) | `eval/judge-groundedness.ts` |

**Livrable** : baseline chiffrée par classe (recall@k, critères, latence, taux agentique). **Critère de fin** : le rapport tourne en une commande.

### Sprint 1 — Colmater le retrieval (gratuit, cible : pertinence)

| Tâche | Détail | Fichiers |
|---|---|---|
| S1.1 | **FTS OR-isé** : construire côté EF une requête mots-clés jointe par `OR` (la syntaxe `websearch_to_tsquery` le supporte) au lieu de la question brute ; améliorer `extractKeywords` (conserver codes/normes type « 25.41 », « NF EN 1154 », chiffres, accents) | `search/retrieval.ts`, `routing/safety.ts` — pas de changement SQL pour cette partie |
| S1.2 | **Fix enfants L1** (v15) : sortir les enfants du LIMIT principal — primaires `LIMIT match_count`, puis enfants des primaires retenus (cap 2–3 par parent + cap global) retournés en plus | nouvelle `rag.match_documents_v15` (migration) |
| S1.3 | **Élargir l'entonnoir** : pool vector `match_count × 4` (3 700 chunks → coût négligeable), le seuil d'intent reste appliqué en aval | `match_documents_v15` |
| S1.4 | **Réécriture conditionnelle de requête** : si historique non vide ET question elliptique (heuristique : < 8 mots, ou débute par « et/pareil/idem », ou pronom sans antécédent) → appel LLM léger (gemini-2.5-flash-lite, temp 0, ~50 tokens, timeout 800 ms, fallback = requête brute) → `rewritten_query` utilisée pour embedding + FTS | `index.ts`, nouveau `routing/condenser.ts` |
| S1.5 | **Gate agentique assaini** : statistiques calculées sur les seuls chunks `match_source ∈ {vector, intersection}` ; déclenchement sur `max_sim < seuil OU n_vector < N` ; décision tracée dans query_logs | `agentic/orchestrator.ts` |

**Critère de succès** : recall@k en hausse sur C1/C2/C5/C6, zéro régression ailleurs, taux de déclenchement agentique cohérent (mesuré). **Risque** : la réécriture ajoute ~300–800 ms sur les follow-ups uniquement — accepté.

### Sprint 2 — Multi-docs / comparaisons

| Tâche | Détail | Fichiers |
|---|---|---|
| S2.1 | **Budget agentique dédié** : chronomètre démarré au déclenchement de la Phase B (et non au début de la requête) | `index.ts`, `orchestrator.ts` |
| S2.2 | **Supprimer la double génération** : si Gemini répond en texte dans la boucle, streamer ce texte tel quel (pas de second appel) | `orchestrator.ts`, `gemini-agent.ts` |
| S2.3 | **Comparaison déterministe** : si intent=comparison ET ≥ 2 documents détectés → exécuter directement une recherche ciblée par document (résolution `filter_file_ids`) en parallèle, fusionner, et générer — sans passer par la boucle agentique. La boucle reste le fallback quand les documents ne sont pas identifiables | `index.ts`, `search/retrieval.ts` |
| S2.4 | **Visibilité frontend** : gérer les events SSE `agentic_start` / `agent_thinking` / `agent_searching` / `agent_found` dans le composant d'étapes existant ; exploiter le payload `agentic` de l'event `sources` | ARPET : `src/services/chat/chat-sse.ts`, `chat-types.ts`, composant étapes |
| S2.5 | Si l'éval le justifie : `max_iterations: 4` pour comparison (override DB, pas de code) | config DB |

**Critère de succès** : juge C3 (les deux documents cités) en nette hausse ; temps des comparaisons stable ou réduit malgré plus de recherches.

### Sprint 3 — Génération + reranker

| Tâche | Détail | Fichiers |
|---|---|---|
| S3.1 | **`llm_model` configurable** : lire `parameters.generation.llm_model` depuis la DB (fallback gpt-4o-mini conservé) | `config.ts` |
| S3.2 | **A/B modèles de génération chunks** sur le golden set : candidats gpt-4.1-mini et gemini-2.5-flash (qualité de sourçage, raisonnement croisé, coût, latence) — décision sur chiffres | config DB + rapport éval |
| S3.3 | **Activer le reranking Cohere** (`enable_reranking: true` en DB, flag déjà câblé) : récupérer ~30 candidats (S1.3) → rerank-v3.5 → top 10–12 ; vérifier `search/reranker.ts` ; mesurer +latence (~150–300 ms attendu) | config DB, `search/reranker.ts` |

**Critère de succès** : critères factuels et fidélité en hausse, surtout C1/C2/C8 ; coût/requête documenté. **Décision gate** : si S1+S2 suffisent sur les chiffres, Cohere peut être différé.

### Sprint 4 — Corpus

| Tâche | Détail |
|---|---|
| S4.1 | **Ré-ingestion couche app** (CCAG.pdf, Norme NFP03-001.pdf) via n8n FLUX 3 v5.1.0 ; archivage des anciens chunks (status), vérification anti-doublons ; purge des 24 chunks hierarchy 2/3 |
| S4.2 | **Ré-ingestion docs projet de janvier** : PGC-Bessières, DBC, AE signé, RICT-DCE |
| S4.3 | **QQOQCCP → FTS** : vérifier le mécanisme de population du `fts` (colonne générée ou trigger), puis migration pour y inclure les entités clés (`comment_normes`, `qui_lots`, localisations) en plus du contenu |
| S4.4 | (Option, si le bruit persiste après S4.1) : pondération de couche dans le ranking (project > app hors questions normatives) |

**Critère de succès** : C6 (normes) et C3 (croisements projet↔norme) en hausse ; re-run complet du banc.

## 6. Hors périmètre V1 (différé volontairement)

- Changement de modèle d'embedding (re-embed complet) : on mesure d'abord — si le recall reste insuffisant après Sprints 1–4, une V2 évaluera text-embedding-3-large ou un modèle multilingue.
- Refonte du pipeline n8n (on réutilise FLUX 3 v5.1.0 tel quel).
- Réintroduction de l'UI cross-ref (supprimée du frontend en février) — la détection backend reste en place.
- Optimisations frontend hors chat (code-splitting…), QA memory avancée (garde-fous d'entités), table `dtu_lot_mapping`.

## 7. Suivi d'avancement

| Sprint | Statut | Baseline avant | Rapport après |
|---|---|---|---|
| 0 — Mesure | ✅ terminé 2026-09-13 | — | `Frontend-Baikal/eval/reports/baseline-v2.0.0.md` |
| 1 — Retrieval | ✅ terminé 2026-09-15 (plan `Frontend-Baikal/docs/superpowers/plans/2026-09-13-sprint1-rag-retrieval.md`) | `v2.0.0` + synth | `Frontend-Baikal/eval/reports/baseline-v2.1.0.md` + `-synth.md` |
| 2 — Multi-docs | ⏳ | | |
| 3 — Génération + reranker | ⏳ | | |
| 4 — Corpus | ⏳ | | |


### 7.1 Baseline v2.0.0 (2026-09-13, 35 questions, golden set v1 intégralement validé)

| Classe | n | Recall doc | Critères | MRR | p50 | p95 | Agentique |
|---|---|---|---|---|---|---|---|
| C1 fait précis | 8 | 100 % | 75 % | 0,69 | 2,8 s | 12,6 s | 13 % |
| C2 info éclatée | 5 | 100 % | 100 % | 0,87 | 3,9 s | 4,4 s | 0 % |
| C3 croisement | 4 | 75 % | 75 % | 0,46 | 4,1 s | 5,0 s | 0 % |
| C4 synthèse | 4 | 100 % | **25 %** | 1,00 | 5,2 s | **35,7 s** | 0 % |
| C5 suivi implicite | 4 | 75 % | **50 %** | 0,75 | 5,0 s | 19,1 s | 75 % |
| C6 norme / code | 3 | 67 % | 67 % | 0,44 | 2,9 s | 3,7 s | 0 % |
| C7 hors corpus | 4 | n/a | 100 % | n/a | 3,7 s | 6,5 s | 75 % |
| C8 verbatim | 3 | 100 % | 67 % | 0,83 | 2,2 s | 4,2 s | 0 % |
| **GLOBAL** | **35** | **90 %** | **71 %** | **0,73** | **4,1 s** | **19,1 s** | **20 %** |

Rappel **par page** (calculé hors ligne depuis les en-têtes `[Page N]` des aperçus, 14 entrées avec page attendue) : **3/14**. Le flux SSE `sources` ne porte pas de champ `page` explicite (voir P11 ci-dessous) — la métrique « Page OK » du harnais reste `n/a` tant que ce champ n'est pas émis.

Juge de fidélité (étage 2) : **non exécuté** — `GEMINI_API_KEY` absente de `eval/.env` au moment du run. À lancer dès la clé posée : `deno run -A eval/judge-groundedness.ts --from-report eval/reports/baseline-v2.0.0.json`.

**Lecture des 10 échecs → problèmes de la spec (§3) :**

| Échec | Symptôme observé | Problème confirmé |
|---|---|---|
| C1-005 (pétanque / Saint Jean) | le chunk p.56 n'est pas remonté, réponse « pas trouvé » ; le mot rare « pétanque » ne sauve pas la recherche | **P2** (FTS mort) |
| C6-003 (articles L. 8221-3 à L. 8221-5) | aucun doc projet remonté, réponse « pas trouvé » | **P2** (codes perdus par extractKeywords) |
| C8-001 (article 2.3.9) | mauvais chunks du CCTP, « l'article 2.3.9 n'est pas mentionné » | **P2** (numéro d'article non exploité) |
| C4-004 (résume le CCAG) | « Je ne peux pas fournir de résumé car cela proviendrait d'un résumé généré par IA » | **P3** (synthèse servie depuis des L0 que le prompt interdit de sourcer) |
| C5-002 (« dans le ccap ? ») | question de suivi embeddée brute, §7.2 non trouvé ; scores 1,0 sur NFP03-001/CCAG (échelle GraphRAG) | **P4** + **P5** |
| C5-003 (« sors-moi l'article ») | agentique cherche des fichiers « CR » littéralement, ne trouve rien | **P4** (pas de condensation) |
| C3-001 (mémoire technique vs CCTP) | le Mémoire Technique n'est jamais remonté ; comparaison non exécutée document par document | **P6** → S2.3 (comparaison déterministe) |
| C4-001 (synthèse CCTP 20 lignes) | 35,7 s en mode Gemini full-doc ; réponse correcte mais « rénovation énergétique » ≠ « réhabilitation énergétique » | latence Gemini + critère à assouplir (« énergétique ») |
| C4-002 (résume le mémoire technique) | résumé correct mais « OPH 31 » absent | critère à revoir (le MT parle du client sans le nommer ainsi) |
| C1-006 (pas japonais) | réponse « uniquement Dunant » alors que la page 57 cite aussi Les Ecoles | frontière de chunk ou enfant L1 coupé — à vérifier en base (**P3 ?**) |

**Nouveau problème identifié au baseline :**

| # | Problème | Localisation | Impact |
|---|---|---|---|
| P11 | ✅ **Corrigé au Sprint 1** (commit `2f97aea`) — `sources.ts` lit désormais `page_start` (fallback `page`) au lieu de `chunk.metadata.page` seul, qui restait nul sur les chunks du pipeline v5.x. « Page OK » est désormais mesuré : **71 %** réel (`baseline-v2.1.0.md`), **70 %** synthétique (`baseline-v2.1.0-synth.md`) | `sources.ts:60` | citations inline avec page correcte, métrique « Page OK » exploitable pour le suivi |

Décisions d'ajustement du golden set après baseline (à appliquer **avant** le run S1 pour comparer à périmètre égal, ou à conserver et documenter) : C4-001 critère « énergétique » ; C4-002 critère à redéfinir ; C1-006 à trancher après lecture du chunk p.57.

### 7.2 Baseline synthétique v2.0.0-synth (2026-09-13, 60 questions, `eval/golden-set.synthetic.json`)

Jeu complémentaire écrit par Claude Code à partir des chunks en base (chaque attendu vérifié dans le chunk cité), formulé en langage oral de conducteur de travaux, sans le vocabulaire des chunks. Couvre deux projets absents du set réel : **CMP** (5 CCTP de lots + CCAP, 538 chunks) et **Citroën** (CCAG + CR n°40/41, 300 chunks). Scores toujours séparés du set réel (`--golden eval/golden-set.synthetic.json --tag <tag>-synth`). Rapport : `Frontend-Baikal/eval/reports/baseline-v2.0.0-synth.md`.

Le run 1 a été joué avec les critères v1 (critères 55 %). Huit critères trop stricts ont été corrigés en v1.1 (durées en lettres, graphie « NF C 15-100 », mots-clés absents d'une réponse juste) ; re-score hors ligne sur les mêmes réponses :

| Classe | n | Recall doc | Critères v1.1 | p50 | Agentique | Lecture |
|---|---|---|---|---|---|---|
| C1 fait précis | 8 | 100 % | 100 % | 2,3 s | 0 % | les faits simples passent, y compris sur CMP et Citroën |
| C2 info éclatée | 6 | 100 % | 50 % | 2,3 s | 0 % | SC2-004 répond depuis la norme NFP03-001 (couche app) au lieu du CCAP EHPAD → **P8** |
| C3 croisement | 10 | 100 % | 40 % | 2,5 s | 0 % | le premier document est traité, le second ignoré (CR 41, lot 07, acte d'engagement, lot plâtrerie) → **P6/S2.3** |
| C4 synthèse | 6 | 100 % | 100 % | 3,8 s | 0 % | résumés corrects sur les documents à L0 (contraste avec C4-004 « résume le CCAG » du set réel) |
| C5 suivi implicite | 8 | 88 % | 50 % | 3,0 s | 50 % | SC5-001 répond depuis le CCAG art. 53.2 (couche app), SC5-008 confond dépassement de délai et de montant → **P4 + P8** |
| C6 norme / code | 10 | 100 % | 100 % | 1,9 s | 0 % | les normes citées dans un chunk sont trouvées quand la question est thématique |
| C7 hors corpus | 6 | n/a | 100 % | 1,9 s | 0 % | aucune fuite inter-projets (charte chantier vert sur CMP, amiante sur Citroën) |
| C8 verbatim | 6 | 83 % | **0 %** | 1,7 s | 0 % | **« Que dit l'article 3.7 / 9.5 / 8.2 / 3.3 / 5.4 ? » → six refus « pas trouvé »** alors que le document est remonté → **P2** (numéro d'article inexploité par le FTS et absent de l'embedding) |
| **GLOBAL** | **60** | **96 %** | **68 %** | **2,3 s** | **7 %** | |

**Trois enseignements nets, absents ou faibles dans le set réel :**

1. **Recherche par numéro d'article : 0/6.** Le document est presque toujours remonté (recall 83 %) mais jamais le bon chunk, et la génération refuse. C'est la cible n°1 de S1.1 (conserver « 3.7 », « 9.5 », « 8.2 » dans `extractKeywords` et les passer au FTS en OR).
2. **La couche app parasite les projets** (P8) : sur 4 échecs C2/C5, la réponse cite le CCAG ou la NFP03-001 génériques au lieu du CCAP du projet. Justifie S4.4 (pondération project > app hors questions normatives) plus tôt que prévu, ou un filtre `include_app_layer` piloté par l'intent.
3. **Multi-documents : 40 %.** Le mode agentique ne se déclenche jamais sur C3 (0 %) parce que le premier document suffit à passer la quality gate ; le second n'est jamais cherché. Confirme la comparaison déterministe de S2.3 (recherche ciblée par document détecté).

Latence : p50 2,3 s et agentique 7 % (contre 4,1 s et 20 % sur le set réel) — les questions synthétiques sont plus « propres », le set réel reste la référence pour la latence perçue.

### 7.3 Sprint 1 — résultats (2026-09-15, code jusqu'au commit `038242a`)

Rejeu complet des deux golden sets sur `baikal-retrieval` v2.1.0 (FTS OR-isé + `match_documents_v15`, condensation des suivis, pondération couche application, P11 corrigé, documents nommés). Rapports : `Frontend-Baikal/eval/reports/baseline-v2.1.0.md` et `baseline-v2.1.0-synth.md`, comparés à `baseline-v2.0.0.md` / `-synth.md` (§7.1, §7.2).

#### Réel (35 questions, golden set v1)

| Métrique | v2.0.0 | v2.1.0 |
|---|---|---|
| Recall documentaire | 90 % | 97 % |
| Critères | 71 % | 69 % (24/35 ; 71 % au rejeu précédent du même code — variance inter-runs ±1 question) |
| MRR | 0,73 | 0,79 |
| Page OK (P11) | non mesurable | 71 % |
| p50 | 4,1 s | 4,3 s |
| Agentique | 20 % | 26 % |
| C7 sentinelles | 4/4 | 4/4 (C7-004 refusée : « Aucun fichier de CCTP ne porte « gros » ou « œuvre », donc le document … n'existe pas dans le projet. Cependant, dans le CCAP… ») |

Par classe (critères, v2.0.0 → v2.1.0) :

| Classe | v2.0.0 | v2.1.0 |
|---|---|---|
| C1 fait précis | 6/8 | 7/8 |
| C2 info éclatée | 5/5 | 3/5 |
| C3 croisement | 3/4 | 3/4 |
| C4 synthèse | 1/4 | 2/4 |
| C5 suivi implicite | 2/4 | 2/4 |
| C6 norme / code | 2/3 | 2/3 |
| C7 hors corpus | 4/4 | 4/4 |
| C8 verbatim | 2/3 | 1/3 |

Gains nominatifs (échec v2.0.0 → réussite v2.1.0) : C1-005, C1-006, C4-002, C8-001.
Pertes nominatives (réussite v2.0.0 → échec v2.1.0) : C1-002, C2-001, C2-003, C8-002, C8-003.

#### Synthétique (60 questions, golden set synthétique v1.2)

| Métrique | v2.0.0 | v2.1.0 |
|---|---|---|
| Recall documentaire | 96 % | 98 % |
| Critères | 55 % à l'exécution (33/60) ; 68 % après re-score des critères corrigés (§7.2) | 83 % (50/60) |
| MRR | 0,78 | 0,93 |
| p50 | 2,3 s | 2,9 s |
| Agentique | 7 % | 8 % |
| C7 hors corpus | 6/6 | 6/6 |

Par classe (critères, v2.0.0 → v2.1.0) :

| Classe | v2.0.0 | v2.1.0 |
|---|---|---|
| C1 | 7/8 | 8/8 |
| C2 | 2/6 | 5/6 |
| C3 | 3/10 | 7/10 |
| C4 | 3/6 | 5/6 |
| C5 | 4/8 | 5/8 |
| C6 | 8/10 | 10/10 |
| C7 | 6/6 | 6/6 |
| C8 | 0/6 | 4/6 |

Gains : SC1-001, SC2-001, SC2-004, SC2-005, SC3-003, SC3-004, SC3-005, SC3-008, SC4-001, SC4-002, SC4-004, SC5-001, SC5-004, SC6-003, SC6-006, SC8-001, SC8-002, SC8-004, SC8-005.
Pertes : SC4-006, SC5-007.
Numéros d'article (C8) : 0/6 → 4/6. Croisements (C3) : 3/10 → 7/10.

#### Classement des échecs restants — réel

- **Critère à revoir** : C4-001 (réponse dit « rénovation énergétique », le critère attend « réhabilitation énergétique ») ; C6-003 (la réponse traite les articles L. 8221-3 à 5 du Code du travail sans écrire « travail dissimulé ») ; C3-001 (« désamiantage » attendu dans une comparaison MT/CCTP) ; C2-003 (répond 100/150 €/jour depuis le CCAP du projet au lieu du plafond 10 % du CCAG — réponse plus utile pour l'utilisateur, conséquence voulue du poids 0,5 de la couche application, critère du set réel à documenter) ; C8-003 (annexe 2 de la charte : contenu juste, libellé exact « Communication Parties Prenantes » absent).
- **Sprint 2** : C5-002 et C5-003 (condenser : réécriture de suivi imparfaite, recopie de la réponse précédente) ; C8-002 (« article 2 Définitions » = CCAG de la couche application, la réponse prend l'article 2 du CCAP projet) ; C1-002 (14 mois lus dans le Mémoire Technique p.29 au lieu de 9 mois — arbitrage multi-documents) ; C2-001 (refus alors que le CCTP p.55 est remonté — prompt/retrieval).
- **Corpus (Sprint 4)** : C4-004 (CCAG legacy sans enfants L1 liés, P3).
- **Variance** : C3-004 (recall perdu sur un rejeu, retrouvé sur l'autre).

#### Classement des échecs restants — synthétique

- **Multi-documents / croisements (Sprint 2)** : SC3-006, SC3-007, SC3-010.
- **Suivis / condenser (Sprint 2)** : SC5-005, SC5-007, SC5-008.
- **Numéro d'article ou de point non retrouvé (Sprint 2, P2 résiduel)** : SC8-003 (« 3.6 du CCTP du lot 06 »), SC8-006 (« point 5.4 de la charte »).
- **Critère de détail dans un résumé** : SC2-006 (« auto-lissant »), SC4-006 (« dalles sur plots »).

#### Enseignements du Sprint 1

1. **Full-text OR-isé + v15** : le recall documentaire réel passe de 90 à 97 % ; les numéros d'article sont désormais exploités (synthétique C8 0/6 → 4/6).
2. **Condensation des suivis** : réécritures pertinentes dans la majorité des cas ; défaut connu : le condenser recopie parfois la réponse précédente dans la question réécrite (C5-003) → prompt à corriger au Sprint 2.
3. **Gate agentique lisible** : sur le rejeu final, distribution des raisons 93 `fast_path_ok`, 13 `too_few_vector_chunks`, 1 `low_max_similarity` (107 requêtes journalisées, soit ~87 % / 12 % / 1 %).
4. **Poids 0,5 de la couche application** : C2-003 répond depuis le CCAP du projet (100/150 €) au lieu du plafond CCAG — réponse plus utile, à documenter dans le critère.
5. **Documents nommés (résolution scalable)** : quand la question nomme un document, une requête ciblée par type (`sources.files`, regex insensible à la casse, limite 20) établit quels fichiers de ce type existent ; le bloc « DOCUMENTS NOMMES DANS LA QUESTION » n'affirme « AUCUN » que s'il n'existe aucun fichier du type, sinon il liste les fichiers et laisse le modèle juger (règle 8). Le nom du projet est lu dans `core.projects` pour ne pas prendre « de CMP » pour un qualifiant. C7-004 est refusée ; SC4-002/SC4-003/SC8-005 (documents nommés avec nom de projet ou d'établissement) passent. Le CCAG, document de la couche application, est exclu de ce mécanisme jusqu'au Sprint 2 (résolution couche app avec les DTU). Traçabilité : colonne `rag.query_logs.named_documents`.

#### Décisions

- `baikal-retrieval` v2.1.0 en production (code jusqu'au commit `038242a` du repo Baikal ; migrations `rag_match_documents_v15` et `rag_query_logs_named_documents` appliquées).
- Baselines figées dans git : `eval/reports/baseline-v2.1.0.*` et `baseline-v2.1.0-synth.*` (commit `7ba0c48`).
- Prochaine étape : Sprint 2 (multi-documents S2.x, prompt du condenser, résolution couche application pour CCAG/DTU, faux positifs éventuels des types `plan`/`notice` à réactiver sur preuve des logs `named_documents`).

### 7.4 Sprint 2 — résultats (2026-09-21, code jusqu'au commit `0887ab0` du repo Baikal)

Rejeu complet des deux golden sets sur `baikal-retrieval` v2.2.0 déployée (accès vérifié par le jeton et `rag.resolve_access`, intents restaurés, recherche ciblée par document nommé, budget agentique dédié et réponse directe, condenser sans recopie, CCAG par la couche application, lecture intégrale à la demande). Rapports : `Frontend-Baikal/eval/reports/baseline-v2.2.0.md` et `baseline-v2.2.0-synth.md`, comparés à `baseline-v2.1.0.md` / `-synth.md` (§7.3). Plan exécuté : `Frontend-Baikal/docs/superpowers/plans/2026-09-19-sprint2-rag.md`.

Trois passages du même code ont été joués sur le set réel (`s2-v2.2.0` avant les correctifs de niveaux, `s2b-v2.2.0`, puis `baseline-v2.2.0`) : critères 30/35, 29/35, 29/35 — la variance inter-runs de ±1 question annoncée au Sprint 1 se confirme ; C5-003 et C8-003 basculent d'un passage à l'autre.

#### Réel (35 questions, golden set v1 — 5 critères révisés, validés par Eric le 2026-09-19)

| Métrique | v2.1.0 | v2.2.0 |
|---|---|---|
| Recall documentaire | 97 % | 93 % (33/35 : C3-004 pré-existant, C5-003 variance — 97 % au rejeu `s2b`) |
| Critères | 69 % (24/35) | 83 % (29/35), dont 4 par révision de critères (C2-003, C4-001, C6-003, C8-003) |
| Les deux documents cités (C3, nouvelle métrique `source_docs_all`) | 75 % (3/4, recalculé sur le rapport v2.1.0) | 75 % (3/4) |
| MRR | 0,79 | 0,805 |
| Page OK (P11) | 71 % | 62 % |
| p50 | 4,3 s | 3,9 s (3,3 s et 4,0 s aux deux autres passages) |
| p95 | 12,6 s | 9,6 s |
| Agentique | 26 % | 29 % |
| C7 sentinelles | 4/4 | 3/4 (C7-004 refuse bien sur le fond — « Aucun fichier de CCTP portant spécifiquement sur le gros œuvre n'existe dans le projet » — mais la formulation échappe au motif du harnais, fenêtre de 60 caractères) |

Par classe (critères, v2.1.0 → v2.2.0) :

| Classe | v2.1.0 | v2.2.0 |
|---|---|---|
| C1 fait précis | 7/8 | 7/8 |
| C2 info éclatée | 3/5 | 4/5 |
| C3 croisement | 3/4 | 4/4 |
| C4 synthèse | 2/4 | 4/4 |
| C5 suivi implicite | 2/4 | 2/4 |
| C6 norme / code | 2/3 | 3/3 |
| C7 hors corpus | 4/4 | 3/4 |
| C8 verbatim | 1/3 | 2/3 |

Gains nominatifs : C2-003, C3-001, C4-001, C4-004, C6-003, C8-003. Perte nominative : C7-004 (harnais, voir ci-dessus).

#### Synthétique (60 questions, golden set synthétique v1.2 + `source_docs_all` sur les 10 SC3)

| Métrique | v2.1.0 | v2.2.0 |
|---|---|---|
| Recall documentaire | 98 % | 98 % |
| Critères | 83 % (50/60) | 83 % (50/60) — mêmes 10 échecs |
| Les deux documents cités (C3) | 100 % (recalculé) | 100 % |
| MRR | 0,926 | 0,929 |
| Page OK | 70 % | 77 % |
| p50 | 2,9 s | 2,4 s |
| p95 | 5,9 s | 5,4 s |
| Agentique | 8 % | 5 % |
| C7 hors corpus | 6/6 | 6/6 |

Par classe : identique à v2.1.0 (C1 8/8, C2 5/6, C3 7/10, C4 5/6, C5 5/8, C6 10/10, C7 6/6, C8 4/6). Aucun gain ni perte nominatif.

#### Classement des échecs restants — réel

- **Harnais** : C7-004 (refus correct, motif `aucun (fichier|document)[^.]{0,60}(projet|corpus)` trop court — à élargir au Sprint 3 hors comparabilité).
- **Génération (Sprint 3)** : C8-002 (l'agent trouve désormais l'article 2 du CCAG p.4 grâce au repli couche application de `search_in_file`, mais « acheteur » n'apparaît pas dans l'énumération) ; C1-002 (14 mois du Mémoire Technique p.29 retenus au lieu des 9 mois p.19 — arbitrage intra-document) ; C5-002 (« dans le ccap ? » réécrit correctement « Le marché est-il révisable d'après le CCAP ? », 6 extraits ciblés du CCAP, mais la page 12 est préférée à la page 9 « variation des prix ») ; C2-001 (VRD refusé alors que le CCTP p.55 est en sources).
- **Variance** : C5-003 (réussi au passage `s2b`, perdu à la baseline).
- **Corpus (Sprint 4)** : C3-004 (le CCTP TCE ne remonte jamais sur les limites de prestations entre lots ; seul le PGC répond).

#### Classement des échecs restants — synthétique

- **Génération avec les deux documents en sources (Sprint 3)** : SC3-006 (partie CR 41 : rangement/polystyrène), SC3-007 (délai de levée des réserves), SC3-010 (DTU 25.41 du lot 07 lu dans le lot 08), SC5-007, SC5-008 (pénalité 100 €), SC8-003 et SC8-006 (numéro de point ou de section non exploité).
- **Détail dans un résumé** : SC2-006 (« auto-lissant »), SC4-006 (« dalles sur plots », mode intégral).
- **Rappel** : SC5-005 (jours de gel du CR 41 : boucle agentique sans source).

#### Enseignements du Sprint 2

1. **Sécurité (fait établi, corrigé)** : jusqu'à la v2.1.0, la clé anon publique et des UUID arbitraires suffisaient à lire les documents de n'importe quel projet (`get_agent_context` sans contrôle d'appartenance, `match_documents_v15` SECURITY DEFINER exécutable par `anon` sur le schéma `rag` exposé). Depuis la migration `rag_acces_retrieval` (2026-09-20) et la v2.2.0 : identité lue dans le jeton, appartenance par `rag.resolve_access` (même prédicat que la RLS de `core.projects`), `app_id` pinné au profil, toutes les fonctions `rag` hors triggers fermées à `anon`/`authenticated` (sauf `delete_conversation`/`close_conversation`). Smoke : clé anon → 401, non-membre → 403. Le banc s'authentifie en `service_role`. Piège rencontré : les variables `SUPABASE_*_KEY` injectées dans l'Edge Function ne sont plus les JWT legacy que les clients envoient — le rôle se lit dans la claim `role` du JWT (signature vérifiée par la passerelle, `verify_jwt = true`).
2. **Intents** : `comparison`/`synthesis`/`citation` n'atteignaient jamais la production (0 `comparison` sur 576 requêtes journalisées : `safeRequiresSearch` rétrogradait toute question avec un mot interrogatif). Restaurés, ils ont d'abord fait disparaître le Mémoire Technique de Bessières (aucun chunk L0 : recall 87 % au premier passage) — les stratégies `synthesis`/`comparison` cherchent désormais en L0 + L1, la recherche ciblée toujours en L0 + L1. Quatre fichiers Bessières n'ont pas de L0 (AE DBC, DBC = Mémoire Technique, PGC, RICT) : ré-ingestion au Sprint 4. Les motifs d'intent sont bornés en début de mot (« représente » ≠ « présente »).
3. **Recherche ciblée par document nommé** : sur les 327 requêtes des campagnes, 155 nommaient un document et 142 ont reçu des extraits ciblés (1 115 extraits). C3 réel 4/4 aux critères, 3/4 aux deux documents cités (C3-004 = corpus). Sur le synthétique, les deux documents étaient déjà dans les sources dans 10 cas sur 10 en v2.1.0 : l'échec C3 est dans la génération (gpt-4o-mini n'exploite qu'un document), pas dans le rappel — c'est le sujet du Sprint 3.
4. **Boucle agentique** : 39 déclenchements sur 327 requêtes, 39 réponses directes (S2.2 : plus de seconde génération), aucun budget épuisé (S2.1), aucune erreur ; `search_in_file` voit la couche application (C8-002 trouve le CCAG). S2.5 (`max_iterations: 4` pour les comparaisons) sans objet : la boucle n'est déclenchée sur aucune question C3.
5. **Condenser** : 26 réécritures (~1,0 s chacune), plus aucune recopie de la réponse précédente observée ; C5-003 gagné puis perdu (variance), C5-002 reste un problème de choix d'extrait.
6. **Juge de fidélité** : premier passage possible (clé Gemini posée). Résultats instables entre deux passages du même code (C2 0,85 → 0,61 ; C5 0,75 → 0,25 ; C1 0,88 → 0,83) et non significatifs pour C4 (mode intégral : le juge ne voit que les extraits) et C7 (refus). À moyenner sur trois passages, sur extraits seulement, avant d'en faire un critère. Rapports enrichis : `baseline-v2.1.0.judged.json`, `baseline-v2.2.0.judged.json`.
7. **Latence** : p50 −0,4 s (réel) et −0,5 s (synthétique) ; le contrôle d'accès coûte ~0 ms en `service_role` et un aller-retour GoTrue pour un utilisateur (à lire dans `timings.auth` en production).
8. **Méthode** : sans le rejeu après lecture des échecs, la v2.2.0 aurait été figée avec la régression du Mémoire Technique — la lecture par classe et par question reste la règle, jamais le chiffre global seul.

#### Décisions

- `baikal-retrieval` v2.2.0 en production (code jusqu'au commit `0887ab0` du repo Baikal ; migration `rag_acces_retrieval` appliquée le 2026-09-20 ; correctifs auth par claim, niveaux L0 + L1 et intents bornés déployés le 2026-09-21).
- Baselines figées dans git : `eval/reports/baseline-v2.2.0.*` et `baseline-v2.2.0-synth.*` (+ `.judged.json`).
- S2.5 : aucun changement de `max_iterations`.
- Frontend ARPET (bouton « Approfondir », étapes agentiques, messages 401/403) sur `main` ; la mise en production (`master`, Vercel) est à la décision d'Eric.
- Prochaine étape : Sprint 3 — S3.1 `llm_model` configurable, S3.2 A/B gpt-4.1-mini / gemini-2.5-flash sur les échecs de génération listés ci-dessus (C3 synthétique, C1-002, C5-002, C8-002), S3.3 Cohere seulement sur preuve ; Sprint 4 — L0 des quatre fichiers Bessières, ré-ingestion CCAG/NFP03-001, QQOQCCP → FTS ; harnais — élargir le motif de refus, moyenner le juge sur trois passages.

---

*Document généré à partir de l'audit du 2026-06-12 (lecture complète de `baikal-retrieval` v2.0.0, de `rag.match_documents_v14` en production, de la config live `config.agent_prompts` et des statistiques du corpus).*
