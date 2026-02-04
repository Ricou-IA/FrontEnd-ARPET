# CLAUDE.md — Projet ARPET (FrontEnd)

> Ce fichier est lu automatiquement par Claude Code à chaque session.
> Dernière mise à jour : 2026-02-03

## 🏗️ Contexte Projet

**ARPET** est un assistant IA pour la conduite de travaux BTP.
Il s'appuie sur le moteur **BAIKAL** (RAG multi-tenant) pour fournir des réponses sourcées à partir de documents techniques, réglementaires et projets.

- **Produit** : Application web SaaS pour professionnels du BTP
- **Utilisateurs** : Conducteurs de travaux, chefs de chantier, équipes projet
- **Domaine** : `arpet.ai` (production) / `arpet-omega.vercel.app` (preview)

## 📁 Structure du Repo

```
FrontEnd-ARPET/
├── CLAUDE.md              ← Ce fichier
├── docs/                  ← Spécifications techniques par module
│   └── SPEC_MEETING_V2.md
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── vercel.json
├── tsconfig.json
└── src/
    ├── App.tsx            ← Router principal
    ├── main.tsx           ← Point d'entrée
    ├── index.css          ← Styles globaux + Tailwind
    ├── components/        ← Composants React organisés par domaine
    │   ├── chat/          ← Interface de chat RAG
    │   ├── meeting/       ← Module réunion (enregistrement, CR)
    │   ├── dictation/     ← Dictée vocale
    │   ├── landing/       ← Page d'accueil publique
    │   └── ...
    ├── hooks/             ← Custom hooks React
    ├── lib/               ← Configuration clients (Supabase, etc.)
    ├── pages/             ← Pages/routes
    ├── services/          ← Services métier (API calls, logique)
    ├── stores/            ← State management
    ├── types/             ← Types TypeScript partagés (index.ts)
    └── utils/             ← Utilitaires (formatters, helpers)
```

## 🛠️ Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| Backend | Supabase (Auth, PostgreSQL, Storage, Edge Functions) |
| LLM | Google Gemini (RAG), OpenAI GPT (extraction meeting) |
| Workflow | n8n (ingestion documents, pipelines async) |
| Déploiement | Vercel (auto-deploy depuis GitHub) |
| Repo | `Ricou-IA/FrontEnd-ARPET` — branche par défaut : `master` |

## 🗄️ Architecture Base de Données (Supabase)

### Schemas principaux

- **`core`** : Organisations, profiles, projets, membres, permissions, notifications, intervenants
- **`arpet`** : Meetings, meeting_items, meeting_participants, calendar_events_scan
- **`rag`** : Documents, chunks, embeddings, conversations, gemini_caches, agent configs

### Tables clés

```
core.organizations        → Tenants (multi-org)
core.profiles             → Utilisateurs
core.projects             → Projets/chantiers
core.project_members      → Liaison users ↔ projets
core.intervenants         → Contacts externes (entreprises, sous-traitants)
core.projet_intervenants  → Liaison intervenants ↔ projets
core.notifications        → Notifications in-app et email

arpet.meetings            → Réunions enregistrées
arpet.meeting_items       → Items extraits (décisions, actions, issues)
arpet.meeting_participants → Participants diarisés
arpet.calendar_events_scan → Événements calendrier scannés par Recall.ai

rag.source_files          → Fichiers ingérés
rag.document_chunks       → Chunks vectorisés
rag.conversations         → Historique chat
```

### Permissions

Le système utilise des **Row Level Security (RLS)** Supabase + des vues SQL avec permissions calculées côté DB. Les rôles sont : `super_admin`, `org_admin`, `team_leader`, `user`.

## 🎨 Conventions UI/UX

- **Mode clair** pour ARPET (stone/amber palette)
- **Mode sombre** pour Baikal Console (cyan accents, monospace)
- Composants autonomes, pas de librairie UI externe (pas de shadcn, pas de MUI)
- Icônes : `lucide-react`
- Responsive mobile-first (usage terrain sur smartphone)

## ⚙️ Conventions de Code

### Règles impératives

1. **Toujours demander l'autorisation** avant de modifier du code
2. **Fournir le fichier complet** — pas de snippets partiels, pas de `// ...reste inchangé`
3. **Commandes terminal en PowerShell** (environnement Windows)
4. **Tester les modifications** sur l'architecture multi-tenant (vérifier les RLS)

### Patterns

- Services dans `src/services/` : fonctions async qui retournent `{ data, error }`
- Types centralisés dans `src/types/index.ts` + types locaux dans chaque service
- Edge Functions Supabase en TypeScript (`supabase/functions/`)
- Nommage : `kebab-case` pour fichiers, `PascalCase` pour composants, `camelCase` pour fonctions

### Edge Functions (règle de déploiement)

- Le code source des Edge Functions est dans le repo **Frontend-Baikal** (`supabase/functions/`)
- Claude Code modifie les fichiers dans ce repo
- L'utilisateur déploie manuellement vers Supabase
- **Ne jamais déployer directement via MCP** sans accord explicite

### Commandes

```powershell
# Dev local
npm run dev

# Build
npm run build

# Déploiement
git push origin master    # Auto-deploy Vercel
```

## 📋 Modules & Specs Détaillées

| Module | Fichier spec | Statut |
|--------|-------------|--------|
| Meeting V2 (Gladia + Recall) | `docs/SPEC_MEETING_V2.md` | 🔨 En développement |
| Cross-Référencement Documents | `docs/SPEC_CROSS_REF_V1.md` | 🔨 P1+P2 implémentés |
| Email Gateway (Inbound) | À créer | 📋 Spécifié |
| BAIKAL Brain V3 | Voir project knowledge | 📋 Spécifié |

**→ Pour chaque tâche, lis d'abord le fichier spec correspondant dans `/docs/`.**

## 🔌 Services Externes

| Service | Usage | Config |
|---------|-------|--------|
| Supabase | Backend complet | `.env` → `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Gemini | RAG generation | Secret Supabase `GEMINI_API_KEY` |
| Gladia | Transcription audio | Secret Supabase `GLADIA_API_KEY` |
| Recall.ai | Bot visio (Teams/Meet/Zoom) | Secret Supabase `RECALL_API_KEY` |
| Vercel | Hosting frontend | Auto via GitHub integration |

## ⚠️ Points d'Attention

- **Zero hallucination** : Le RAG BAIKAL impose un sourcing strict. Ne jamais inventer des données.
- **Multi-tenant** : Chaque requête doit être scopée par `org_id`. Vérifier les RLS.
- **Audio long** : Les traitements audio > 5min doivent être asynchrones (queue/worker, pas de spinner bloquant).
- **Ingestion pipeline** : Les documents passent par FLUX 1→3 (n8n). Ne pas créer de chemins parallèles.

## 🔄 Workflow de Développement

### Pipeline : Claude (idéation) → Claude Code (exécution)

1. **Idéation & Cadrage** (Claude chat)
   - L'utilisateur travaille avec Claude pour explorer ses idées
   - Interview, brainstorming, définition des objectifs
   - Claude produit un **cahier des charges** structuré

2. **Prise en charge** (Claude Code)
   - L'utilisateur transmet le cahier des charges à Claude Code
   - Claude Code le transforme en **plan de travail** (todo list, fichiers à créer/modifier, ordre des opérations)
   - Validation du plan par l'utilisateur avant toute modification

3. **Exécution** (Claude Code)
   - Déroulement du plan étape par étape
   - `npm run build` après chaque série de modifications
   - Validation utilisateur à chaque étape

4. **Stabilisation & Push**
   - Build complet ✅ + tests fonctionnels
   - L'utilisateur valide le résultat final
   - Commit + push vers GitHub uniquement quand c'est stable

### Règle d'or
- **Claude Code ne pousse jamais vers GitHub sans accord explicite**
- **Claude Code ne code jamais sans plan validé** (sauf corrections mineures)

## 🔄 Protocole de Session Claude Code

### Démarrage
- Claude Code lit automatiquement `CLAUDE.md` + `git status`
- L'utilisateur situe le contexte en une phrase : quel chantier, quelle suite
- Si un chantier est en cours, lire le fichier `docs/` correspondant

### Pendant la session
- Toujours planifier avant de coder (todo list) pour les tâches complexes
- Valider chaque étape avec l'utilisateur avant de passer à la suivante
- Ne jamais pousser vers GitHub sans accord explicite
- Lancer `npm run build` après chaque série de modifications pour vérifier

### Clôture
- Faire un résumé de session (ce qui a été fait, ce qui reste, décisions prises)
- Mettre à jour la section "État courant" ci-dessous
- Commit si l'état est stable (après accord utilisateur)

### Liaison entre sessions
- La section "État courant" est la source de vérité pour reprendre le travail
- Les specs détaillées vont dans `docs/`
- Chaque nouvelle conversation commence par lire ce fichier

## 📌 État Courant

**Date** : 2026-02-03
**Branche** : `refactor/technical-debt`
**Statut build** : ✅ OK
**Dernier commit** : `4f4ee00` — refactor: split large files into modular structure (non poussé)
**Modifications non commitées** : UX Sources Chat + Cross-Ref P1/P2 (~15 fichiers modifiés)

### Ce qui a été fait (session 2026-02-03 — Cross-Référencement P1+P2)

- **Cross-Ref P1 — Types, mapping, SSE** (6 fichiers) :
  1. Types `CrossRefMode`, `CrossRefAction`, `CrossRefAnalysis` dans `chat-types.ts`
  2. `mapCrossRefAnalysis()` dans `chat-mapping.ts` — parse `cross_ref` du payload `analysis`
  3. Handler SSE `case 'analysis'` dans `chat-sse.ts` → extrait `cross_ref`, appelle `onCrossRefActions`
  4. Envoi `cross_ref_mode` et `cross_ref_context` dans `chat-sse.ts` et `chat-request.ts`
  5. `Message.cross_ref_actions` ajouté dans `chat.types.ts` (type inline pour éviter import circulaire)
  6. Barrel exports mis à jour (`chat/index.ts` + `chat.service.ts`)

- **Cross-Ref P2 — Follow-up Actions UI** (6 fichiers) :
  1. **`CrossRefActions.tsx`** (nouveau) — boutons Comparer/Conformité/Synthétiser avec icônes et couleurs par type
  2. **`AssistantMessage.tsx`** — prop `onCrossRefAction`, affichage `CrossRefActions` sous les sources
  3. **`MessageBubble.tsx`** — pass-through prop `onCrossRefAction`
  4. **`Dashboard.tsx`** — capture cross-ref actions via SSE (`onCrossRefActions` callback), stockage dans le message, handler `handleCrossRefAction` (message user synthétique + requête spécialisée avec `cross_ref_mode`/`detected_documents`/`cross_ref_context`)
  5. **`format-content.ts`** — ajout `formatTables()` : rendu tableaux markdown en `<table>` HTML avec styles Tailwind
  6. **`chat.service.ts`** — ajout exports `CrossRefAction`, `CrossRefMode`, `OnCrossRefActionsCallback`

- **Cross-Ref P1 Backend (repo Baikal)** — implémenté dans une session séparée :
  - `routing/cross-ref.ts` (nouveau) — module heuristique : regex DTU/NF, lookup QQOQCCP, génération actions
  - `routing/analyzer.ts` — intégration dans `buildFallbackAnalysis()`
  - `search/retrieval.ts` — recherche dual-scope (project + app layer)
  - `index.ts` — payload SSE `analysis` enrichi avec `cross_ref`
  - `types.ts` + `config.ts` — types et config cross-ref

### ⚠️ Limitation test actuelle : DTU non ingérés
Les DTU/normes ne sont pas encore dans la base app layer. La recherche cross-ref dual-scope (project + app) fonctionne côté code mais ne peut pas trouver de résultats DTU.
- La détection heuristique (regex DTU/NF dans la question) fonctionne
- Les boutons follow-up s'affichent quand le backend émet le payload
- Le test complet avec résultats croisés nécessite l'ingestion d'au moins 1 DTU
- **TODO** : ingérer DTU 25.41 (plâtrerie/cloisons) comme premier DTU de test, puis mettre à jour les tests

### Ce qui a été fait (sessions antérieures)
- **UX Sources Chat** — 9 fichiers modifiés, 5 fonctionnalités :
  1. **Citations inline cliquables** : `[CCTP TCE, Page 56, Section 2.3.9.1]` → lien cliquable qui ouvre le viewer à la bonne page
     - `format-content.ts` : `formatCitations()` détecte patterns `[Doc, Page X, ...]` → `<a class="source-citation" data-source-name data-source-page>`
     - `AssistantMessage.tsx` : handler délégué `handleContentClick` → match source → `openViewer({ initialPage })`
     - `index.css` : styles `.source-citation` (italique, dashed underline, hover bleu)
  2. **Filtrage sources parasites** : seuls les documents effectivement cités dans la réponse sont affichés
     - `SourcesList.tsx` : `filterCitedSources()` compare `document_name` avec le contenu de la réponse
     - Fallback sécurité : si le filtre élimine tout, affiche toutes les sources
  3. **Badges sources améliorés** : italique, entièrement cliquables (pas juste l'icône), affichage `(p.X)`
     - `SourceBadge.tsx` : badge `<button>` au lieu de `<span>` + icône Eye à gauche + `initialPage`
  4. **Fix PdfViewer** : navigation directe vers `initialPage` (contourne la virtualisation)
     - `PdfViewer.tsx` : `scrollToPageDirect()` — calcul position par offset → `scrollTop` instantané → recentrage buffer → `scrollIntoView` précis
     - Bug original : la virtualisation (buffer ±3 pages) empêchait le scroll vers des pages lointaines
  5. **Types + mapping** : `page?: number` ajouté dans `MessageSource`, `SSESourcesPayload`, `RawChatResponse`, `chat-mapping.ts`
- Refactoring technique complet (6 phases) :
  - Suppression `dark-mode.css` orphelin
  - Éclatement `chat.service.ts` → 4 modules (`chat-types`, `chat-mapping`, `chat-request`, `chat-sse`)
  - Éclatement `Sidebar.tsx` → 4 sous-composants (`NavItem`, `SidebarNavigation`, `SidebarConversations`, `SidebarProfile`)
  - Éclatement `DocumentRow.tsx` → 4 sous-composants (`ProcessingIcon`, `DocumentRowEdit`, `DocumentRowView`, `DocumentRowActions`)
  - Nettoyage `meeting.service.ts` (console.log → DEV only)
- Fix SSE frontend : ajout handler `'message'` pour mode conversationnel brain-v3
- Centralisation `RAG_ENDPOINT` dans `chat-types.ts`
- Wrapper tous `console.log` du chat service avec `import.meta.env.DEV`
- `baikal-brain-v3` v3.2.0 : routing intelligent `generation_mode` (gemini forcé pour synthesis/citation/comparison + document détecté) — déployé sur Supabase + synchronisé dans repo Baikal
- **`baikal-retrieval` v1.3.0** : architecture "Search-First, Analyze-Later" — déployé sur Supabase
  - Phase A fast path : `buildFallbackAnalysis` (sync, 0ms) → search → generate (~3-4.5s)
  - Phase B widening : si 0 résultats → LLM `analyzeQuery` → re-embed → search élargi
  - A/B testing complété (6 questions) : retrieval gagne en vitesse (3s vs 3.6s factual, 590ms salutations)
- **`match_documents_v14`** créée dans Supabase :
  - Intersection boost : chunks trouvés par vector+fulltext boostés x1.5 en RRF
  - Source tagging : 'intersection' / 'vector' / 'fulltext' / 'graphrag' / 'child'
  - Nettoyage index doublons sur `rag.document_concepts`
- Frontend A/B toggle : `useChatConfig` (Zustand) + `BackendToggle.tsx` dans Dashboard
- **Pipeline ingestion FLUX 3-v2 — Architecture 2 passes validée** (session 2026-02-03) :
  - Passe 1 (3.6c v5.1.0) : Chunking sémantique Gemini avec ratio L0/L1 corrigé (1:4.6 vs 1:1 avant)
  - Passe 2 (3.6h v1.1.0) : Enrichissement QQOQCCP — 86% enrichis (vs 0% avant, fix MAX_TOKENS)
  - Fix `maxOutputTokens: 8192 → 65536` sur 3.6h
  - Suppression `available_concepts` du metadata Passe 2 (~3500 tokens économisés/appel)
  - L0 envoi `summary` au lieu de `content_raw` en Passe 2
  - Ajout champ `importance` dans enrichissement
  - Fix 3.8b PostgreSQL : `total_chunks` → `chunk_count`
  - Test CCTP (172 pages) : 293 chunks (vs 819), 52 L0 / 241 L1, ~17min (vs 46min), 0 erreurs
- **`baikal-retrieval` v1.4.0** — Optimisation retrieval (session 2026-02-03) :
  - Migration `match_documents_v13` → `match_documents_v14` (intersection boost + source tagging)
  - Tuning seuil fast-path : `factual.min_similarity` 0.50 → 0.42 (config.ts + analyzer.ts)
  - Prompt engineering : `page_start`/`page_end` dans formatContext (au lieu de `page`)
  - Instruction sourçage durcie : interdiction d'inventer des numéros de page/section
  - Réponse "pas trouvé" améliorée : cadre général + absence signalée + 2-3 suggestions connexes
  - Déployé sur Supabase, testé avec 6 questions (voir résultats ci-dessous)

### Résultats ingestion CCTP v5.1.0 (test validé 2026-02-03)

| Métrique | Avant (v5.0.0/v1.0.0) | Après (v5.1.0/v1.1.0) |
|----------|------------------------|------------------------|
| Total chunks | 819 | 293 (-64%) |
| L0 / L1 | 421 / 386 (1:0.9) | 52 / 241 (1:4.6) |
| QQOQCCP enrichis | 0/819 (0%) | 253/293 (86%) |
| Questions générées | 50/819 (6%) | 253/293 (86%) |
| Key points | 50/819 (6%) | 253/293 (86%) |
| Concepts | 804/819 (98%) | 293/293 (100%) |
| Erreurs enrichissement | 819 (MAX_TOKENS) | 0 |
| Temps ingestion | 46 min | ~17 min |

### QQOQCCP — Entités extraites (293 chunks CCTP)

| Entité | Chunks | Taux |
|--------|--------|------|
| Quoi → ouvrages | 142 | 48% |
| Quoi → matériaux | 135 | 46% |
| Qui → intervenants | 116 | 40% |
| Combien (mesures) | 108 | 37% |
| Où → localisations | 103 | 35% |
| Comment → normes | 83 | 28% |
| Qui → lots | 32 | 11% |
| Quand | 253 | 86% |

**7 résidences identifiées** : Cannas, Dunant, Faubourg des arts, Lassalle, Les Ecoles, Presbytère, Saint Jean

### En cours / À faire

**Cross-Référencement Documents — P1+P2 ✅ IMPLÉMENTÉ** (session 2026-02-03)

Spec complète : `docs/SPEC_CROSS_REF_V1.md`

| Couche | Statut | Détail |
|--------|--------|--------|
| **DB `match_documents_v14`** | ✅ Prêt | Intersection boost x1.5, `filter_filenames`, `include_app_layer` |
| **Backend routing** | ✅ P1 | `routing/cross-ref.ts` (heuristique), intégré dans `buildFallbackAnalysis()` |
| **Backend search** | ✅ P1 | Recherche dual-scope (project + app layer), fusion résultats |
| **Backend SSE** | ✅ P1 | `analysis` enrichi avec `cross_ref` (actions, norms, lot, detection_method) |
| **Frontend types** | ✅ P1 | `CrossRefAnalysis`, `CrossRefAction`, `CrossRefMode`, `Message.cross_ref_actions` |
| **Frontend SSE** | ✅ P1 | `mapCrossRefAnalysis()`, handler `onCrossRefActions`, envoi `cross_ref_mode`/`cross_ref_context` |
| **Frontend UI actions** | ✅ P2 | `CrossRefActions.tsx`, intégré dans `AssistantMessage`, handler dans `Dashboard` |
| **Frontend tableaux** | ✅ P2 | `formatTables()` dans `format-content.ts` |
| **Frontend Wizard** | ❌ P3 | `CrossRefWizard.tsx` — pas encore implémenté |
| **DB DTU Mapping** | ❌ P4 | `rag.dtu_lot_mapping` — pas encore créée |
| **DTU ingérés** | ❌ Bloquant | Aucun DTU dans l'app layer → test cross-ref dual-scope impossible pour l'instant |

**Fichiers modifiés P1+P2 (repo ARPET) :**

| Fichier | Phase | Modification |
|---------|-------|-------------|
| `src/services/chat/chat-types.ts` | P1 | Types `CrossRefMode`, `CrossRefAction`, `CrossRefAnalysis`, enrichissement `ChatRequest`/`StreamOptions` |
| `src/types/chat.types.ts` | P1 | `Message.cross_ref_actions` (type inline) |
| `src/services/chat/chat-mapping.ts` | P1 | `mapCrossRefAnalysis()` |
| `src/services/chat/chat-sse.ts` | P1 | Handler SSE `analysis` + envoi `cross_ref_mode`/`cross_ref_context` |
| `src/services/chat/chat-request.ts` | P1 | Envoi `cross_ref_mode`/`cross_ref_context` |
| `src/services/chat/index.ts` | P1 | Barrel exports |
| `src/services/chat.service.ts` | P2 | Re-exports `CrossRefAction`, `CrossRefMode`, `OnCrossRefActionsCallback` |
| `src/components/chat/AssistantMessage/CrossRefActions.tsx` | P2 | **Nouveau** — boutons follow-up (Comparer/Conformité/Synthétiser) |
| `src/components/chat/AssistantMessage/AssistantMessage.tsx` | P2 | Prop `onCrossRefAction`, affichage `CrossRefActions` |
| `src/components/chat/MessageBubble.tsx` | P2 | Pass-through `onCrossRefAction` |
| `src/pages/Dashboard.tsx` | P2 | Capture SSE, stockage, handler `handleCrossRefAction` |
| `src/components/chat/utils/format-content.ts` | P2 | `formatTables()` — rendu tableaux markdown |

**Prochaines étapes cross-ref :**

1. **Ingérer au moins 1 DTU** (ex: DTU 25.41 plâtrerie) dans l'app layer pour tester le dual-scope
2. **Test end-to-end** avec une question type "Le CCTP mentionne le DTU 25.41, quelles incidences ?"
3. **Mettre à jour les tests** avec les résultats réels (détection, actions, réponse croisée)
4. **P3 — Wizard** : `CrossRefWizard.tsx` + intégration `ChatInput.tsx`
5. **P4 — DTU Mapping** : table `rag.dtu_lot_mapping` + seed data

**Tâches en attente (non cross-ref) :**

1. **Retirer le toggle A/B** du Dashboard avant merge
   - Supprimer `BackendToggle.tsx` du Dashboard
   - Retrieval v1.4.0 est validé comme endpoint principal
   - Optionnel : nettoyer `useChatConfig` si plus utilisé

2. **Merge branche `refactor/technical-debt`** → `master` (ARPET)
   - Vérifier que le toggle A/B est retiré
   - Build + validation preview Vercel
   - Push vers GitHub

3. **Cohere reranking** (futur)
   - `search/reranker.ts` existe mais est désactivé (`features.reranking_enabled = false`)
   - Pourrait améliorer la précision du ranking, surtout pour les requêtes ambiguës
   - Nécessite clé API Cohere + coût additionnel par requête

4. **Ré-ingestion globale** avec pipeline v5.1.0
   - Seul le CCTP a été ré-ingéré, les autres documents sont encore en v5.0.0
   - Prioriser les documents les plus consultés

### Fichiers n8n versionnés dans `docs/`

| Nœud | Fichier | Version | Description |
|------|---------|---------|-------------|
| 3.6c | `n8n-node-3.6c-v5.1.0.js` | **v5.1.0** ✅ | Prep Gemini — ratio L0/L1 fixé, target 2000 tokens |
| 3.6e | `n8n-node-3.6e-v5.0.0.js` | v5.0.0 | Format Chunks (Passe 1) |
| 3.6f | `n8n-node-3.6f-v1.0.0.js` | v1.0.0 | Micro-batch splitter (10 chunks/batch) |
| 3.6h | `n8n-node-3.6h-v1.1.0.js` | **v1.1.0** ✅ | Prep QQOQCCP — fix MAX_TOKENS, cleanup concepts |
| 3.6j | `n8n-node-3.6j-v1.0.0.js` | v1.0.0 | Parse QQOQCCP response |
| 3.6m | `n8n-node-3.6m-v1.0.0.js` | v1.0.0 | Merge + buildEnrichedContent (fusion finale) |

### Autres tâches en attente
- Warning Vite : chunk JS ~987 kB (optimisation code-splitting à prévoir)
- 404 récurrents sur `/functions/v1/baikal-librarian` (sans version) — probablement un cron/webhook n8n mal configuré
- Ré-ingérer les autres documents avec le pipeline v5.1.0 (seul le CCTP a été ré-ingéré)

### Décisions actives
- On ne pousse rien vers GitHub tant que la version locale n'est pas validée
- **`baikal-retrieval` v1.4.0 est validé** comme endpoint principal (remplace brain-v3 + librarian-v4)
- `match_documents_v14` branchée dans retrieval et déployée en prod
- Les Edge Functions se modifient dans le repo Baikal, l'utilisateur déploie
- Pipeline ingestion FLUX 3-v2 (2 passes) validé sur CCTP — prêt pour ré-ingestion globale
- Toggle A/B à retirer avant merge vers master

### Résultats A/B Testing v1.4.0 vs v1.3.0 (session 2026-02-03)

| # | Question | v1.3.0 (avant) | v1.4.0 (maintenant) | Verdict |
|---|----------|----------------|----------------------|---------|
| 1 | Terrain de pétanque | ✅ 3.0s | ✅ 6.1s (cold start) | = |
| 2 | Délai global travaux | ❌ 1.8s "pas trouvé" | **✅ 1.8s "9 mois" sourcé** | **v1.4 +++** |
| 3 | Pénalités de retard | ✅ 13.3s (widening) | **✅ 5.7s (no widening)** | **v1.4 +++** |
| 4 | Prescriptions acoustiques | ✅✅ 11.6s (widening) | **✅✅ 5.4s (no widening)** | **v1.4 ++** |
| 5 | Bonjour | ✅ 590ms | **✅ 483ms** | **v1.4 +** |
| 6 | Tarte aux pommes | 8.6s "pas trouvé" | 7.8s + suggestions BTP | **v1.4 +** |

**Gains principaux v1.4.0 :**
- Q2 : de "pas trouvé" → réponse correcte sourcée (seuil 0.42)
- Q3 : -57% temps (widening éliminé grâce au seuil + intersection boost)
- Q4 : -53% temps (idem)
- Q6 : suggestions contextuelles BTP au lieu de réponse sèche

### Résultats A/B Testing historique — v1.3.0 vs Brain-v3

| # | Question | Retrieval v1.3.0 | Brain-v3 | Verdict |
|---|----------|-------------------|----------|---------|
| 1 | Terrain de pétanque | ✅ 3.0s | ✅ 3.6s | Retrieval + |
| 2 | Délai global travaux | ❌ 1.8s "pas trouvé" | ⚠️ 7.2s cadre général | Brain-v3 + |
| 3 | Pénalités de retard | ✅ 13.3s (widening) | ✅ 9.9s | = qualité |
| 4 | Prescriptions acoustiques | ✅✅ 11.6s excellent | ❌ 16.9s "pas trouvé" | Retrieval +++ |
| 5 | Bonjour | ✅ 590ms | ✅ >3s | Retrieval +++ |
| 6 | Tarte aux pommes | 8.6s "pas trouvé" | 3.9s + suggestions | Brain-v3 + |
| 7 | 15 éléments résidence Dunant | ✅ 20.6s (widening) — 15 items pertinents, cross-doc | N/A | Retrieval ✅ |

### Architecture `baikal-retrieval` v1.4.0

**Repo** : `Frontend-Baikal` → `supabase/functions/baikal-retrieval/`

```
baikal-retrieval/
├── index.ts          ← Main handler (v1.5.0 Search-First + Cross-Ref)
├── types.ts          ← Types unifiés (+ CrossRefAnalysis, CrossRefAction)
├── config.ts         ← Configs + CROSS_REF_CONFIG (regex, seuils)
├── context.ts        ← Agent context
├── sources.ts        ← Formatting sources
├── utils.ts          ← Utilitaires
├── routing/
│   ├── analyzer.ts   ← Analyse query LLM + buildFallbackAnalysis (+ cross-ref intégré)
│   ├── cross-ref.ts  ← **NOUVEAU** — Détection heuristique cross-ref (regex DTU/NF, lookup QQOQCCP)
│   ├── router.ts     ← Décision de routing + resolveGenerationMode
│   └── safety.ts     ← Checks sécurité + intent keywords
├── search/
│   ├── retrieval.ts  ← Recherche vectorielle (+ dual-scope project/app layer)
│   ├── reranker.ts   ← Cohere reranking (désactivé)
│   ├── embedding.ts  ← Génération embeddings OpenAI
│   └── memory.ts     ← QA memory
└── generation/
    ├── gemini.ts     ← Streaming Gemini
    ├── openai.ts     ← Streaming OpenAI
    └── prompt.ts     ← Construction prompts (+ templates compare/compliance/synthesize)

Pipeline v1.5.0 :
Phase A (~1.8-6s) : config → [context ‖ embed] → buildFallbackAnalysis(sync, + cross-ref heuristique) → memory → search(v14, dual-scope si cross-ref) → generate
Phase B (si 0 résultats, +5-6s) : SSE 'widening' → analyzeQuery LLM → re-embed? → search élargi → generate
```

### Modifications v1.4.0 (fichiers modifiés dans repo Baikal)

| Fichier | Modification |
|---------|-------------|
| `search/retrieval.ts` | `match_documents_v13` → `v14` (intersection boost x1.5) |
| `config.ts:41` | `factual.min_similarity` 0.50 → 0.42 |
| `routing/analyzer.ts:160` | `buildFallbackAnalysis` factual 0.50 → 0.42 |
| `generation/prompt.ts` (formatContext) | Lecture `page_start`/`page_end` avec fallback `page` |
| `generation/prompt.ts` (règle 2) | Instruction stricte sourçage : uniquement pages du header chunk |
| `generation/prompt.ts` (règle 3) | Réponse "pas trouvé" : cadre général + absence + 2-3 suggestions |

### Base de données — Fonctions RPC RAG

| Fonction | Version | Statut | Description |
|----------|---------|--------|-------------|
| `match_documents_v13` | legacy | ⚪ Disponible | Hybrid search (vector + fulltext + GraphRAG + hierarchy) |
| `match_documents_v14` | prod | ✅ Active (retrieval v1.4.0) | v13 + intersection boost x1.5 + meilleur source tagging |

**Stats table `rag.documents`** : ~1739 chunks (après ré-ingestion CCTP : 293 chunks vs 819 avant), embeddings 1536 dim
**Index HNSW** : m=16, ef_construction=64 (OK pour <10K vecteurs)
