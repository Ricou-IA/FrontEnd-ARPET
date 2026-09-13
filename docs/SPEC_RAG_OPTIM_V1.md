# SPEC_RAG_OPTIM_V1 — Optimisation du pipeline RAG ARPET/BAIKAL

> **Statut** : spec validée (audit + plan en 5 sprints approuvés le 2026-06-12). **Sprint 0 terminé le 2026-09-13** (baseline v2.0.0 figée). Prochain : plan d'implémentation détaillé du Sprint 1.
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
| 1 — Retrieval | 🔜 à planifier | baseline-v2.0.0 | |
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
| P11 | **`page` toujours nul dans le payload `sources`** : `sources.ts` lit `chunk.metadata.page`, mais les chunks du pipeline v5.x portent `page_start` / `page_end` (vérifié en base le 2026-09-13 : clé `page` absente). Le frontend ARPET attend `page` pour les citations cliquables, le harnais pour « Page OK » | `sources.ts:60` — fallback `metadata.page ?? metadata.page_start` | citations inline sans page (le clic vers la page ne fonctionne pas), métrique page impossible |

Décisions d'ajustement du golden set après baseline (à appliquer **avant** le run S1 pour comparer à périmètre égal, ou à conserver et documenter) : C4-001 critère « énergétique » ; C4-002 critère à redéfinir ; C1-006 à trancher après lecture du chunk p.57.

---

*Document généré à partir de l'audit du 2026-06-12 (lecture complète de `baikal-retrieval` v2.0.0, de `rag.match_documents_v14` en production, de la config live `config.agent_prompts` et des statistiques du corpus).*
