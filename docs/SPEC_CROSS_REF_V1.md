# SPEC_CROSS_REF_V1 — Cross-Référencement Documents ARPET

> Cahier des charges pour la feature de recherche croisée entre documents
> Date : 2026-02-03
> Statut : **Validé** — Prêt pour implémentation
> Ordre des phases : P1 (Moteur) → P2 (Follow-up) → P3 (Wizard) → P4 (DTU Mapping)

---

## 1. Contexte & Objectif

### Problème terrain

Les conducteurs de travaux manipulent simultanément 10-15 documents froids (pièces marché), 50-70 documents chauds (comptes rendus) et potentiellement 100 DTU/normes. Aujourd'hui, croiser les informations entre ces documents est un processus manuel fastidieux : ouvrir plusieurs PDF, chercher les articles, comparer les prescriptions.

### Objectif

Permettre au système ARPET de :
1. **Détecter automatiquement** quand une question implique plusieurs documents
2. **Rechercher dans un scope multi-documents** (projet + base commune DTU)
3. **Proposer des follow-up actions** spécialisées (Comparer, Synthétiser, Vérifier la conformité)
4. **Présenter les résultats croisés** de manière structurée (tableaux de conformité, synthèses sourcées)

### Cas d'usage concrets

| # | Question utilisateur | Documents impliqués | Mode attendu |
|---|---------------------|---------------------|--------------|
| 1 | "Le CCTP mentionne le DTU 25.41, quelles incidences pour les cloisons ?" | CCTP + DTU 25.41 | Synthèse |
| 2 | "Que prévoit le DTU plomberie concernant l'article 2.14 du CCTP ?" | DTU 60.11 + CCTP | Comparaison |
| 3 | "Les prescriptions acoustiques du lot plâtrerie sont-elles conformes au DTU ?" | CCTP lot plâtrerie + DTU 25.41 + DTU 25.42 | Conformité |
| 4 | "Synthétise les obligations pour le lot CVC dans le marché" | CCTP CVC + CCAG + planning | Synthèse |

---

## 2. Architecture Existante — Ce qui est déjà prêt

### Infrastructure OK (aucune modification nécessaire)

| Composant | Détail | Fichier |
|-----------|--------|---------|
| **Types `ChatRequest`** | `detected_documents?: string[]` défini | `src/services/chat/chat-types.ts` |
| **Envoi SSE** | Transmet `detected_documents` si non vide | `src/services/chat/chat-sse.ts:182` |
| **Envoi non-SSE** | Transmet `detected_documents` si non vide | `src/services/chat/chat-request.ts:59` |
| **Response mapping** | `analysis.detected_documents` mappé | `src/services/chat/chat-mapping.ts` |
| **Sources display** | Citations inline cliquables + badges | `AssistantMessage.tsx`, `SourceBadge.tsx` |
| **Filtre sources** | `filterCitedSources()` actif | `SourcesList.tsx` |

### DB prête (paramètres existants dans `match_documents_v14`)

| Paramètre | Type | Usage cross-ref |
|-----------|------|-----------------|
| `include_app_layer` | `boolean` | Inclure la base commune DTU |
| `filter_file_ids` | `uuid[]` | Filtrer par documents spécifiques |
| `filter_filenames` | `text[]` | Filtrer par noms de fichiers |
| `enable_concept_expansion` | `boolean` | Expansion GraphRAG pour termes liés |

### Enrichissement QQOQCCP (déjà dans les chunks)

| Champ | Type | Contenu | Utilité cross-ref |
|-------|------|---------|-------------------|
| `comment_normes` | `text[]` | Références DTU/NF extraites (ex: `["DTU 59.1", "NF Environnement"]`) | Clé de jointure vers base DTU |
| `qui_lots` | `text[]` | Lots techniques (ex: `["PLOMBERIE SANITAIRE"]`) | Filtre par corps de métier |
| `contenu_types` | `text[]` | Type de contenu (prescriptions, obligations, etc.) | Filtre par nature |

### Ce qui manque

| Composant | Statut | Phase |
|-----------|--------|-------|
| Détection cross-ref heuristique (regex + QQOQCCP lookup) | **À créer** | P1 |
| Recherche multi-scope (project + app layer) | **À créer** | P1 |
| Payload `cross_ref_actions` dans événement SSE `analysis` | **À créer** | P1 |
| Follow-up actions UI (Comparer/Synthèse/Conformité) | **À créer** | P2 |
| Prompts spécialisés par mode de croisement | **À créer** | P2 |
| Wizard de formulation | **À créer** | P3 |
| Table `rag.dtu_lot_mapping` | **À créer** | P4 |

---

## 3. Phasage

### Phase 1 — Moteur cross-ref (Backend)

**Objectif** : Le système détecte automatiquement les questions multi-documents et recherche dans le bon scope.

#### 1A. Détection de l'intent cross-ref — Approche hybride (heuristique-first)

**Où** : `baikal-retrieval/routing/analyzer.ts`

**Principe** : Éviter un appel LLM pour classifier l'intent cross-ref. La détection se fait en 2 niveaux :

**Niveau 1 — Heuristique rapide (0ms, dans `buildFallbackAnalysis`)** :
Couvre ~70-80% des cas cross-ref explicites. Règles basées sur :
- **Regex DTU/normes** : `/\bDTU\s*\d+[\.\d]*/i`, `/\bNF\s*[A-Z]/i`, `/\barticle\s+\d+/i`
- **Regex croisement** : `/\b(comparer|conformité|conforme|vérifier|recouper|synthétiser|prescriptions?\s+du|prévoit.*concernant)\b/i`
- **Co-occurrence** : mention d'un DTU/norme + mention d'un document projet (CCTP, CCAG, etc.)
- **Lookup `comment_normes`** : si la query contient un terme qui match les normes déjà indexées dans les chunks du projet
- **Lookup `qui_lots`** : si la query mentionne un lot connu + un verbe d'obligation

**Niveau 2 — LLM fallback (seulement si nécessaire)** :
Activé uniquement quand :
- L'heuristique ne détecte rien de cross-ref
- MAIS la question semble complexe (longueur > 15 mots, ou intent `factual` avec score de confiance bas)
- Utilise `analyzeQuery()` existant, enrichi avec les champs cross-ref

**Avantage** : économise un appel LLM (~500ms + tokens) pour la majorité des requêtes cross-ref.

**Sortie enrichie dans `analysis`** :

```typescript
interface CrossRefAnalysis {
  is_cross_ref: boolean               // Détection croisement
  cross_ref_type: 'compare' | 'synthesize' | 'compliance' | null
  detected_documents: string[]         // Noms des documents détectés
  detected_norms: string[]             // DTU/NF extraits de la question
  detected_lot: string | null          // Lot technique si identifié
  suggested_actions: CrossRefAction[]  // Follow-up actions proposées
}

interface CrossRefAction {
  type: 'compare' | 'synthesize' | 'compliance'
  label: string            // Ex: "Comparer CCTP vs DTU 25.41"
  description: string      // Ex: "Analyser les écarts entre prescriptions"
  documents: string[]      // Documents impliqués
  prompt_hint: string      // Indice pour le prompt spécialisé
}
```

#### 1B. Recherche multi-scope

**Où** : `baikal-retrieval/search/retrieval.ts`

Quand `is_cross_ref === true`, la recherche doit :

1. **Chercher dans le projet** (layer `project`) — documents froids/chauds
2. **Chercher dans la base commune** (layer `app`) — DTU, CCAG, normes
3. **Utiliser `comment_normes`** comme jointure : si un chunk du CCTP cite "DTU 25.41", chercher aussi dans les chunks du DTU 25.41
4. **Utiliser `filter_filenames`** ou `filter_file_ids` si des documents spécifiques sont identifiés

**Stratégie de recherche** :

```
SI detected_norms non vide :
  → Recherche 1 : embed(query) → match_documents_v14(project_layer=true, app_layer=false)
  → Recherche 2 : embed(query) → match_documents_v14(project_layer=false, app_layer=true, filter_filenames=detected_norms)
  → Fusion : interleave les résultats par rank_score, boost x1.3 pour les chunks qui citent les mêmes normes

SI detected_documents non vide (sans normes) :
  → Recherche unique : match_documents_v14(filter_filenames=detected_documents)

SINON (cross-ref implicite, ex: "obligations lot CVC") :
  → Recherche 1 : match_documents_v14(project_layer=true)
  → Post-filtre : extraire les comment_normes des chunks trouvés
  → Recherche 2 : match_documents_v14(app_layer=true, filter_filenames=normes_extraites)
  → Fusion
```

#### 1C. Réponse initiale enrichie

La première réponse est une réponse standard (comme aujourd'hui), mais le payload SSE `analysis` est enrichi avec `cross_ref` :

```typescript
// Événement SSE analysis enrichi
event: analysis
data: {
  "intent": "factual",
  "rewritten_query": "prescriptions DTU 25.41 cloisons CCTP",
  "detected_documents": ["CCTP TCE", "DTU 25.41"],
  "cross_ref": {
    "is_cross_ref": true,
    "cross_ref_type": null,
    "detected_norms": ["DTU 25.41"],
    "detected_lot": "plâtrerie",
    "detection_method": "heuristic",
    "actions": [
      {
        "type": "compare",
        "label": "Comparer les prescriptions",
        "description": "Mettre en regard les exigences du CCTP et du DTU 25.41",
        "documents": ["CCTP TCE", "DTU 25.41"],
        "prompt_hint": "compare_prescriptions"
      },
      {
        "type": "compliance",
        "label": "Vérifier la conformité",
        "description": "Vérifier que les prescriptions du CCTP respectent le DTU",
        "documents": ["CCTP TCE", "DTU 25.41"],
        "prompt_hint": "check_compliance"
      },
      {
        "type": "synthesize",
        "label": "Synthétiser les obligations",
        "description": "Résumer toutes les obligations pour ce sujet",
        "documents": ["CCTP TCE", "DTU 25.41"],
        "prompt_hint": "synthesize_obligations"
      }
    ]
  }
}
```

Le champ `detection_method` (`'heuristic'` | `'llm'`) permet de tracer si la détection a été faite par l'heuristique rapide ou par le LLM fallback (utile pour le monitoring et l'optimisation des regex).

---

### Phase 2 — Follow-up Actions (Frontend + Backend)

**Objectif** : L'utilisateur clique sur un bouton d'action → le système exécute une requête spécialisée avec un prompt dédié.

#### 2A. Composant `CrossRefActions`

**Fichier** : `src/components/chat/CrossRefActions.tsx` (nouveau)

Apparaît sous la réponse de l'assistant quand `cross_ref_actions` est reçu via SSE.

```
┌─────────────────────────────────────────────────────────┐
│  [Réponse standard de l'assistant...]                   │
│                                                         │
│  Sources: [CCTP TCE (p.56)] [DTU 25.41 (p.12)]        │
│                                                         │
│  ┌─ Approfondir ──────────────────────────────────────┐ │
│  │ 🔄 Comparer les prescriptions   CCTP ↔ DTU 25.41  │ │
│  │ ✅ Vérifier la conformité        CCTP → DTU 25.41  │ │
│  │ 📋 Synthétiser les obligations   CCTP + DTU 25.41  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Comportement au clic** :
1. Envoie un nouveau `ChatRequest` avec :
   - `query` = prompt spécialisé (pas la question originale)
   - `detected_documents` = documents de l'action
   - `cross_ref_mode` = `'compare' | 'synthesize' | 'compliance'`
   - `cross_ref_context` = chunks de la réponse précédente (pour ne pas re-chercher)
2. La réponse s'affiche comme un nouveau message assistant dans le même thread

#### 2B. Prompts spécialisés

**Où** : `baikal-retrieval/generation/prompt.ts`

Trois templates de prompts selon le `cross_ref_mode` :

**Mode `compare`** :
```
Tu es un expert BTP. Compare les prescriptions suivantes en mettant en regard :
- Les exigences du document A (CCTP) sur ce sujet
- Les exigences du document B (DTU) sur ce sujet

Présente le résultat sous forme de tableau :
| Aspect | CCTP (prescriptions) | DTU (exigences normatives) | Écart |
|--------|---------------------|---------------------------|-------|

Cite précisément les pages et sections sources.
```

**Mode `compliance`** :
```
Tu es un expert BTP. Vérifie la conformité des prescriptions du CCTP par rapport aux normes DTU applicables.

Pour chaque prescription, indique :
| Prescription CCTP | Norme DTU applicable | Conforme | Observation |
|-------------------|---------------------|----------|-------------|

- ✅ Conforme : la prescription respecte ou dépasse la norme
- ⚠️ À vérifier : la prescription est ambiguë ou partielle
- ❌ Non conforme : la prescription est en deçà de la norme

Cite précisément les pages et articles sources.
```

**Mode `synthesize`** :
```
Tu es un expert BTP. Synthétise l'ensemble des obligations issues des documents suivants pour le sujet demandé.

Structure ta réponse :
1. Obligations contractuelles (CCTP/CCAG)
2. Obligations normatives (DTU/NF)
3. Points d'attention (écarts, zones grises, prescriptions contradictoires)

Cite précisément les pages et documents sources pour chaque obligation.
```

#### 2C. Rendu des réponses croisées

**Où** : `src/components/chat/AssistantMessage/AssistantMessage.tsx`

Le markdown généré par les prompts spécialisés inclut des tableaux. Le rendu existant (markdown → HTML via `format-content.ts`) doit supporter les tableaux markdown correctement.

**Vérification nécessaire** : s'assurer que `formatContent()` rend bien les `| ... | ... |` en `<table>`.

---

### Phase 3 — Wizard de formulation (Frontend)

**Objectif** : Aider l'utilisateur à formuler des questions cross-ref quand il ne sait pas exactement quoi demander.

> **Note** : En V1, le wizard se base sur les `qui_lots` et `comment_normes` déjà indexés dans les chunks. La table `dtu_lot_mapping` (Phase 4) viendra enrichir le wizard avec une base de correspondance structurée.

#### 3A. Composant `CrossRefWizard`

**Fichier** : `src/components/chat/CrossRefWizard.tsx` (nouveau)

Accessible via un bouton dans la zone de saisie du chat (icône "recherche croisée").

**Étapes du wizard** :

```
Étape 1 — Quel est le sujet ?
  [Champ texte libre]
  Ex: "isolation acoustique des cloisons"

Étape 2 — Quel lot est concerné ?
  [Dropdown des lots du projet, déduit des qui_lots indexés]
  Ex: "Plâtrerie" / "CVC" / "Plomberie" / ...

Étape 3 — Que voulez-vous savoir ?
  ○ Comparer les prescriptions du CCTP avec les normes
  ○ Vérifier la conformité d'un article
  ○ Synthétiser toutes les obligations pour ce lot
  ○ Question libre (formulez ci-dessous)

→ [Générer la question]
```

Le wizard construit automatiquement une question structurée et pré-remplit le ChatInput :
```
"Compare les prescriptions d'isolation acoustique du CCTP lot Plâtrerie avec les exigences du DTU 25.41"
```

#### 3B. Alimentation des données du wizard

- **Lots disponibles** : Query distincte sur `rag.documents.qui_lots` filtré par `source_file_id` du projet courant
- **Normes référencées** : Query distincte sur `rag.documents.comment_normes` filtré par le projet courant (sans la table `dtu_lot_mapping`, qui viendra en P4)
- **Documents du projet** : `sources.files` filtrés par `project_id`

---

### Phase 4 — Table DTU/Lot (Backend DB)

**Objectif** : Base de vérité permettant au LLM de déduire les DTU applicables quand ils ne sont pas cités explicitement. Enrichit aussi le wizard (P3) avec des correspondances structurées.

#### 4A. Nouvelle table `rag.dtu_lot_mapping`

```sql
CREATE TABLE rag.dtu_lot_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dtu_reference text NOT NULL,           -- Ex: "DTU 25.41"
  dtu_full_name text,                    -- Ex: "Ouvrages en plaques de parement en plâtre"
  lot_codes text[] NOT NULL,             -- Ex: ["plâtrerie", "cloisons", "doublage"]
  lot_keywords text[],                   -- Mots-clés associés pour matching flou
  applicable_domains text[],             -- Ex: ["acoustique", "thermique", "feu"]
  app_id text NOT NULL DEFAULT 'arpet',  -- Multi-app
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_dtu_lot_mapping_lots ON rag.dtu_lot_mapping USING GIN (lot_codes);
CREATE INDEX idx_dtu_lot_mapping_keywords ON rag.dtu_lot_mapping USING GIN (lot_keywords);
CREATE INDEX idx_dtu_lot_mapping_dtu ON rag.dtu_lot_mapping (dtu_reference);
```

#### 4B. Usage dans le routing

**Où** : `baikal-retrieval/routing/analyzer.ts`

Quand l'heuristique détecte un lot mais pas de DTU spécifique :
1. Query `rag.dtu_lot_mapping` avec le lot détecté
2. Récupérer les DTU applicables
3. Les ajouter à `detected_norms` pour la recherche multi-scope

```typescript
// Pseudo-code — Enrichit le Niveau 1 (heuristique) de la détection cross-ref
if (analysis.detected_lot && analysis.detected_norms.length === 0) {
  const mappings = await supabase
    .from('dtu_lot_mapping')
    .select('dtu_reference')
    .contains('lot_codes', [analysis.detected_lot])
    .eq('is_active', true);

  analysis.detected_norms = mappings.map(m => m.dtu_reference);
}
```

#### 4C. Seed data initial

Prévoir un seed d'environ 50-80 mappings DTU/Lot couvrant les corps de métier principaux :

| DTU | Lot(s) | Domaine |
|-----|--------|---------|
| DTU 25.41 | Plâtrerie, cloisons | Acoustique, thermique |
| DTU 25.42 | Plâtrerie, ouvrages divers | Acoustique |
| DTU 60.11 | Plomberie, sanitaire | Eau froide/chaude |
| DTU 65.10 | Chauffage, CVC | Canalisations |
| DTU 68.3 | CVC, ventilation | VMC, NRA |
| DTU 59.1 | Peinture, revêtements | Finitions |
| DTU 13.3 | Gros-oeuvre, dallages | Fondations |
| DTU 26.1 | Gros-oeuvre, enduits | Façades |
| ... | ... | ... |

L'interface d'administration viendra dans une phase ultérieure pour maintenir et enrichir cette table.

---

## 4. Modifications par fichier

### Backend (repo Baikal)

| Fichier | Phase | Modification |
|---------|-------|-------------|
| `routing/analyzer.ts` | P1 | Heuristique cross-ref (regex + QQOQCCP lookup) dans `buildFallbackAnalysis()` + enrichissement `analyzeQuery()` en LLM fallback |
| `search/retrieval.ts` | P1 | Recherche dual-scope (project + app layer), fusion résultats |
| `generation/prompt.ts` | P2 | 3 templates de prompts spécialisés (compare, compliance, synthesize) |
| `index.ts` | P1 | Payload `analysis` enrichi avec `cross_ref` |
| `types.ts` | P1 | Types `CrossRefAnalysis`, `CrossRefAction` |
| `config.ts` | P1 | Config regex cross-ref + seuils |
| `routing/cross-ref.ts` | P1 | **Nouveau** — Module heuristique dédié (regex DTU/NF, lookup `comment_normes`/`qui_lots`, génération actions) |

### Frontend (repo ARPET)

| Fichier | Phase | Modification |
|---------|-------|-------------|
| `src/services/chat/chat-types.ts` | P1 | Types `CrossRefAction`, `cross_ref_mode` |
| `src/services/chat/chat-sse.ts` | P1 | Handler événement SSE `cross_ref_actions` |
| `src/components/chat/CrossRefActions.tsx` | P2 | **Nouveau** — Boutons follow-up sous la réponse |
| `src/components/chat/AssistantMessage/AssistantMessage.tsx` | P2 | Intégration `CrossRefActions` + support tableaux |
| `src/types/chat.types.ts` | P1 | `cross_ref_actions?: CrossRefAction[]` dans `Message` |
| `src/pages/Dashboard.tsx` | P2 | Handler clic sur action cross-ref → nouveau `sendMessageStream` |
| `src/components/chat/CrossRefWizard.tsx` | P3 | **Nouveau** — Wizard de formulation |
| `src/components/chat/ChatInput.tsx` | P3 | Bouton pour ouvrir le wizard |

### Base de données (Supabase)

| Objet | Phase | Modification |
|-------|-------|-------------|
| `rag.dtu_lot_mapping` | P4 | **Nouvelle table** + index GIN |
| `match_documents_v15` | P1 (optionnel) | Variante avec boost croisé normes (si v14 insuffisante) |

---

## 5. Flux de données complet

```
PHASE 1 — Requête initiale
─────────────────────────────────────────────────────────────────
Utilisateur : "Le CCTP mentionne le DTU 25.41 pour les cloisons"
                              │
                              ▼
                    ┌─────────────────────┐
                    │  cross-ref.ts        │  ← Niveau 1 : Heuristique (0ms)
                    │  Regex DTU/NF/verbes │
                    │  Lookup QQOQCCP      │
                    └────────┬────────────┘
                             │ Détection (method: 'heuristic') :
                             │ - is_cross_ref: true
                             │ - detected_norms: ["DTU 25.41"]
                             │ - detected_lot: "plâtrerie"
                             │ - actions: [compare, compliance, synthesize]
                             ▼
                    ┌─────────────────┐
                    │  retrieval.ts    │
                    │  Recherche 1     │──── project layer → chunks CCTP
                    │  Recherche 2     │──── app layer, filter="DTU 25.41"
                    │  Fusion (‖)      │     (en parallèle)
                    └────────┬────────┘
                             │ Chunks fusionnés (CCTP + DTU)
                             ▼
                    ┌─────────────────┐
                    │  prompt.ts       │
                    │  Prompt standard │
                    └────────┬────────┘
                             │
                             ▼
              SSE : [sources] + [analysis + cross_ref] + [content streaming]
                             │
                             ▼
                    ┌─────────────────┐
                    │  AssistantMessage │
                    │  + CrossRefActions│
                    └─────────────────┘

PHASE 2 — Follow-up (clic utilisateur)
─────────────────────────────────────────────────────────────────
Utilisateur clique "Vérifier la conformité"
                              │
                              ▼
                    ┌─────────────────┐
                    │  Dashboard.tsx    │
                    │  sendMessageStream│
                    │  cross_ref_mode:  │
                    │  'compliance'     │
                    │  detected_documents│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  baikal-retrieval │
                    │  Prompt compliance│
                    │  (template dédié) │
                    └────────┬────────┘
                             │
                             ▼
              SSE : Réponse structurée (tableau conformité)
```

---

## 6. Événements SSE — Protocole enrichi

### Événements existants

| Événement | Payload | Modification |
|-----------|---------|-------------|
| `sources` | `{ sources: SourceItem[] }` | Inchangé |
| `message` | `{ content: string }` (streaming) | Inchangé |
| `analysis` | `{ intent, rewritten_query, detected_documents, cross_ref?: CrossRefAnalysis }` | **Enrichi** — inclut les actions cross-ref |
| `widening` | `{}` (indicateur recherche élargie) | Inchangé |
| `done` | `{ conversation_id }` | Inchangé |

### Choix : `cross_ref_actions` dans `analysis` (pas d'événement séparé)

Les actions cross-ref sont incluses dans le payload `analysis` existant plutôt que dans un événement SSE séparé. Avantages :
- Pas de nouveau type d'événement à gérer côté frontend
- Le frontend mappe déjà `analysis` dans `chat-mapping.ts`
- Cohérent : la détection cross-ref fait partie de l'analyse de la query

### Nouveau champ dans `ChatRequest`

```typescript
interface ChatRequest {
  // ... existant
  cross_ref_mode?: 'compare' | 'synthesize' | 'compliance'  // NOUVEAU
  cross_ref_context?: string                                  // NOUVEAU — chunks de la réponse précédente
}
```

---

## 7. Budget performance

| Opération | Budget temps | Notes |
|-----------|-------------|-------|
| Réponse initiale cross-ref | 6-10s | 2 recherches parallèles + fusion + génération |
| Follow-up action | 5-8s | Contexte déjà disponible, prompt spécialisé |
| Wizard (lookup lots/DTU) | <500ms | Queries SQL simples |

**Animations pendant l'attente** : message SSE `cross_ref_searching` pour indiquer "Recherche croisée en cours — CCTP + DTU 25.41" avec une animation spécifique (distincte du spinner standard).

---

## 8. Contraintes & garde-fous

1. **Pas de hallucination** : les prompts spécialisés interdisent d'inventer des articles/pages non sourcés
2. **Fallback** : si la recherche cross-ref ne trouve rien dans la base commune, répondre normalement avec les chunks projet uniquement + signaler que le DTU n'est pas encore ingéré
3. **Volume** : la fusion de résultats multi-scope ne doit pas dépasser la fenêtre de contexte Gemini (limiter à 15-20 chunks fusionnés)
4. **RLS** : la recherche dans le layer `app` doit respecter le `app_id` de l'organisation
5. **Tableaux** : vérifier que le rendu markdown → HTML dans `formatContent()` supporte bien les tableaux (sinon ajouter le support)

---

## 9. Résumé des priorités

| Phase | Contenu | Dépendances |
|-------|---------|-------------|
| **P1 — Moteur** | Détection heuristique cross-ref + LLM fallback + recherche multi-scope + événement SSE `cross_ref_actions` | Aucune |
| **P2 — Follow-up** | Composant `CrossRefActions` + prompts spécialisés (compare/compliance/synthesize) + rendu tableaux | P1 |
| **P3 — Wizard** | `CrossRefWizard` + intégration ChatInput (basé sur `qui_lots` et `comment_normes` existants) | P1 |
| **P4 — DTU Mapping** | Table `rag.dtu_lot_mapping` + lookup heuristique enrichi + seed data + enrichissement wizard | P1, P3 |

Chaque phase est indépendante et déployable séparément. P1 apporte déjà de la valeur seule (recherche croisée automatique).

### Principe architectural : heuristique-first

La détection cross-ref privilégie les règles heuristiques (regex, lookup métadonnées QQOQCCP) pour éviter un appel LLM supplémentaire. Le LLM n'intervient qu'en fallback pour les questions implicites. Ce choix permet :
- **Latence réduite** : 0ms pour la détection vs ~500ms avec LLM
- **Coût réduit** : pas de tokens consommés pour les cas explicites (70-80% des cross-ref)
- **Extensibilité** : la table `dtu_lot_mapping` (P4) enrichit l'heuristique sans toucher au LLM
