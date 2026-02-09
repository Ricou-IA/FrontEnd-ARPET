# Prompt de liaison — Edge Function `meeting-generate-doc`

> Session Baikal — À copier dans Claude Code sur le repo Frontend-Baikal
> Date : 2026-02-06

---

## Contexte

Je travaille sur le module Meeting V3 d'ARPET (assistant IA pour la conduite de travaux BTP). La Phase 7/8 "Documents Générés" est en cours. Le frontend est terminé (repo Frontend-ARPET), il faut maintenant créer l'Edge Function côté Baikal.

**Le frontend appelle l'Edge Function via :**
```typescript
const { data, error } = await supabase.functions.invoke('meeting-generate-doc', {
  body: {
    project_id: string,      // UUID du projet
    doc_type: 'memo_chantier' | 'fiche_lot',
    lot_reference?: string,   // Obligatoire si doc_type === 'fiche_lot'
  },
});
```

**Réponse attendue (JSON) :**
```json
{
  "file_id": "uuid",
  "file_name": "Memo_chantier_2026-02-06.pdf",
  "download_url": "https://...",
  "doc_type": "memo_chantier"
}
```

---

## Ce que l'Edge Function doit faire

### Flux de génération (v2 — avec enrichissement RAG à la volée)

```
Request (project_id, doc_type, lot_reference?)
    │
    ├─→ Step 1 — Auth : vérifier JWT, récupérer user_id et org_id
    │
    ├─→ Step 2 — Collecte des données projet :
    │   ├─ core.projects (id, name, description, identity)
    │   ├─ core.organizations (name, settings) — pour branding
    │   ├─ core.projet_intervenants + core.intervenants — intervenants du projet
    │   ├─ arpet.meetings — N dernières réunions (ORDER BY meeting_date DESC)
    │   │   N configurable : défaut 4, paramètre optionnel `meeting_count`
    │   ├─ arpet.meeting_items — items des meetings collectés (+ actions ouvertes cross-meetings)
    │   │   Si fiche_lot → filtrer par lot_reference
    │   └─ rag.documents — chunks CCTP du projet (si fiche_lot, filtrer par qui_lots)
    │
    ├─→ Step 2b — ★ Enrichissement RAG à la volée (NOUVEAU) :
    │   │
    │   │  Pour les items de type 'decision', 'action', 'issue' :
    │   │
    │   │  1. Batch embed : regrouper tous les items à enrichir
    │   │     → OpenAI embeddings API (text-embedding-3-small, batch input)
    │   │     → 1 seul appel API pour N items
    │   │
    │   │  2. Recherche RAG parallèle : pour chaque item embedé
    │   │     → match_documents_v14(embedding, project_id, limit=2, threshold=0.45)
    │   │     → Exclure les chunks source_type='meeting' (ne pas matcher réunion↔réunion)
    │   │     → Promise.all() pour paralléliser
    │   │
    │   │  3. Attacher les résultats :
    │   │     → Chaque item reçoit un champ `rag_context[]` (in-memory, pas stocké en DB)
    │   │     → Contenu : { source_file, page_start, page_end, excerpt (150 chars max) }
    │   │     → Si aucun match > threshold → champ vide, pas de contexte forcé
    │   │
    │   │  Budget : ~20 items × 1 embed batch + 20 RPC parallèles
    │   │  Temps estimé : 2-5s (embed ~500ms + 20 RPC ~1-3s en parallèle)
    │   │
    ├─→ Step 3 — Construction prompt LLM
    │   ├─ Template ARPET standard (markdown)
    │   ├─ Données collectées injectées dans le prompt
    │   ├─ ★ Items enrichis : chaque item inclut son contexte contractuel RAG
    │   └─ Instructions de formatting strictes (voir templates ci-dessous)
    │
    ├─→ Step 4 — Appel LLM (GPT-4o)
    │   ├─ response_format: json_object
    │   └─ Output : { markdown_content, title, metadata }
    │
    ├─→ Step 5 — Stockage
    │   ├─ Markdown → Supabase Storage (bucket: "user-workspace", path: project/{org_id}/{filename})
    │   └─ Entrée → sources.files :
    │       ├─ layer: 'project'
    │       ├─ org_id, project_id, created_by (user JWT)
    │       ├─ app_id: 'arpet'
    │       ├─ storage_bucket: 'user-workspace'
    │       ├─ storage_path: le path ci-dessus
    │       ├─ original_filename: "Memo_chantier_YYYY-MM-DD.md" ou "Fiche_lot_Plomberie_YYYY-MM-DD.md"
    │       ├─ mime_type: 'text/markdown'
    │       ├─ processing_status: 'completed'
    │       ├─ ingestion_level: 'none' (PAS d'ingestion RAG)
    │       ├─ metadata: { category: 'documents_generes', doc_type, lot_reference?, description }
    │       └─ promotion_status: 'approved' (directement accessible)
    │
    └─→ Step 6 — Réponse
        ├─ file_id: UUID du sources.files créé
        ├─ file_name: nom du fichier
        ├─ download_url: signed URL (1h) du Markdown dans Storage
        └─ doc_type: le type demandé
```

### Décision d'architecture : Enrichissement RAG à la volée (pas à l'ingestion)

**Problème** : rattacher les items de réunion aux pièces marché (CCTP, plans, etc.)

**Option rejetée** : stocker les liens dans `meeting_items.related_documents` à l'extraction
- Liens figés → deviennent invalides si CCTP ré-ingéré
- CCTP ingéré après le transcript → lien jamais créé
- Mauvais match → erreur permanente

**Option choisie** : recherche RAG à la volée dans l'EF `generate-document`
- Toujours à jour (reflète l'état actuel de la base RAG)
- Pas de maintenance de liens
- Surcoût acceptable (~2-5s sur une génération ponctuelle)
- Même pattern que la Fiche Lot (qui fait déjà du filtrage RAG par `qui_lots`)

---

## Schéma DB pertinent

### Tables à requêter

```sql
-- Projet
core.projects (id, org_id, name, description, status, identity jsonb)

-- Organisation (branding)
core.organizations (id, name, settings jsonb)

-- Intervenants du projet
core.projet_intervenants (id, project_id, intervenant_id, lot_reference, role_in_project)
core.intervenants (id, org_id, name, company, role, specialty)

-- Réunions récentes
arpet.meetings (id, org_id, project_id, meeting_date, meeting_title, summary, formatted_report, participants jsonb, source_type, extraction_status)

-- Items extraits
arpet.meeting_items (id, meeting_id, item_type, subject, content, context, lot_reference, responsible, due_date, status, location, topic_tags text[], related_documents text[], display_order)
-- item_type: 'decision' | 'action' | 'issue' | 'info'
-- status: 'open' | 'done' | 'cancelled' | 'blocked'

-- Chunks RAG (pour enrichissement contractuel + fiche lot)
rag.documents (id, content, layer, org_id, source_file_id, hierarchy_level, qui_lots text[], metadata jsonb, contenu_types text[])
-- source_files join pour récupérer original_filename, page_start, page_end

-- Fichier généré (destination)
sources.files (id, original_filename, mime_type, file_size, layer, org_id, project_id, created_by, app_id, storage_bucket, storage_path, ingestion_level, processing_status, metadata jsonb, promotion_status)
```

### RPC pour enrichissement RAG (match_documents_v14)

```sql
-- Appel depuis l'EF pour enrichir chaque meeting_item
SELECT * FROM rag.match_documents_v14(
  query_embedding := '{embedding_1536_dim}',
  match_count := 2,
  similarity_threshold := 0.45,
  filter_org_id := '{org_id}',
  filter_project_id := '{project_id}',
  filter_layer := 'project',          -- pièces marché du projet uniquement
  include_app_layer := false           -- pas de DTU/normes pour le mémo
);

-- Retourne : id, content, similarity, source_file_name, page_start, page_end, metadata
-- Exclure les chunks issus de meetings (source_type = 'meeting' dans metadata)
```

### Embedding API (batch)

```typescript
// 1 seul appel pour N items (au lieu de N appels)
const embedResponse = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: items.map(item => `${item.subject}. ${item.content || ''}`),
  dimensions: 1536,
});
// embedResponse.data[i].embedding → vecteur pour items[i]
```

### Catégorie DB pour les documents générés
```
config.document_categories :
  id: 'ad65b932-3ec2-4847-8dff-14079aac76fc'
  slug: 'documents_generes'
  label: 'Documents Générés'
  target_apps: ['arpet']
  target_layers: ['project']
  sort_order: 75
```

**IMPORTANT** : le champ `metadata.category` dans `sources.files` doit contenir le **slug** `'documents_generes'` (pas l'UUID). C'est le slug qui est utilisé côté frontend pour le filtre catégorie.

---

## Templates de documents

### Mémo de chantier (v2 — enrichi RAG)

**Input** : dernières réunions + meeting_items enrichis contexte contractuel + infos projet + intervenants

**Structure attendue (markdown) :**

```markdown
# MÉMO DE CHANTIER — {nom_projet}

**Date** : {date_generation}
**Projet** : {nom_projet}
**Entreprise** : {nom_organisation}
**Réunions analysées** : {N} dernières ({date_plus_ancienne} → {date_plus_récente})

---

## Situation générale

{Synthèse de l'avancement global basée sur les dernières réunions}

## Décisions récentes

{Pour chaque décision, inclure la référence contractuelle si un match RAG existe}

- **{date}** — {sujet de la décision}
  {description}
  📄 *Réf. contractuelle : {source_file}, p.{page} — "{extrait court}"*

## Actions en cours

| Action | Responsable | Échéance | Statut | Réf. contractuelle |
|--------|-------------|----------|--------|-------------------|
{Tableau des actions ouvertes, avec colonne référence si match RAG}

## Points de vigilance

{Issues et risques identifiés. Pour chaque issue avec un match RAG,
 mentionner la clause contractuelle concernée}

- ⚠️ **{sujet}** — {description}
  📄 *Réf. : {source_file}, p.{page} — "{clause concernée}"*

## Prochaines échéances

{Dates clés à venir}

---

*Généré par ARPET le {date} — Ce document est une synthèse automatique basée sur {N} réunions et croisée avec les pièces marché du projet*
```

**Règles pour l'enrichissement RAG dans le prompt GPT-4o :**

1. La référence contractuelle est **optionnelle** — ne l'afficher que si un match RAG pertinent existe (score > 0.45)
2. L'extrait doit être court (1 phrase max, ~100 caractères) et fidèle au document source
3. Ne jamais inventer de référence — si pas de match, omettre la ligne `📄 Réf.`
4. Format de la référence : `{nom_fichier_source}, p.{page_start}` (si page disponible)
5. Les items de type `info` ne sont pas enrichis (pas de recherche RAG pour les infos générales)

### Fiche Lot

**Input** : CCTP (chunks RAG filtrés par lot) + meeting_items filtrés par lot + intervenants du lot

**Structure attendue (markdown) :**

```markdown
# FICHE LOT — {lot_reference}

**Projet** : {nom_projet}
**Entreprise** : {nom_organisation}
**Intervenant** : {nom_intervenant} ({company})
**Date** : {date_generation}

---

## Prescriptions contractuelles (CCTP)

{Résumé des prescriptions du CCTP pour ce lot, basé sur les chunks RAG}

## Décisions prises en réunion

{Décisions concernant ce lot, avec dates}

## Actions en cours

| Action | Responsable | Échéance | Statut |
|--------|-------------|----------|--------|
{Tableau des actions ouvertes pour ce lot}

## Points de vigilance

{Issues spécifiques à ce lot}

## Historique des discussions

{Chronologie des sujets abordés en réunion pour ce lot}

---

*Généré par ARPET le {date} — Ce document est une synthèse automatique*
```

---

## Patterns à suivre (repo Baikal)

### Structure fichiers (même pattern que meeting-extract)

```
supabase/functions/generate-document/
├── index.ts          ← Handler principal (auth, orchestration, réponse)
├── collect.ts        ← Collecte des données projet (queries Supabase)
├── enrich.ts         ← ★ NOUVEAU : enrichissement RAG à la volée (batch embed + match_documents_v14)
├── prompts.ts        ← Construction du prompt LLM par doc_type (items enrichis)
├── storage.ts        ← Upload Storage Markdown + insert sources.files
└── types.ts          ← Types locaux (dont EnrichedMeetingItem, RagContext)
```

### Types enrichissement (dans types.ts)

```typescript
interface RagContext {
  source_file_name: string;   // ex: "CCTP TCE.pdf"
  page_start: number | null;  // ex: 56
  page_end: number | null;
  excerpt: string;            // 150 chars max du chunk matché
  similarity: number;         // score pour debug/logging
}

interface EnrichedMeetingItem {
  // Champs existants de meeting_items
  id: string;
  item_type: 'decision' | 'action' | 'issue' | 'info';
  subject: string;
  content: string | null;
  context: string | null;
  lot_reference: string | null;
  responsible: string | null;
  due_date: string | null;
  status: string;
  // Enrichissement RAG (in-memory, pas stocké en DB)
  rag_context: RagContext[];  // 0-2 éléments, vide si pas de match
}
```

### Module enrich.ts (pseudo-code)

```typescript
export async function enrichItemsWithRAG(
  items: MeetingItem[],
  projectId: string,
  orgId: string,
  supabase: SupabaseClient,
  openai: OpenAI,
): Promise<EnrichedMeetingItem[]> {

  // 1. Filtrer : enrichir seulement decision/action/issue (pas info)
  const toEnrich = items.filter(i => i.item_type !== 'info');
  const infoItems = items.filter(i => i.item_type === 'info')
    .map(i => ({ ...i, rag_context: [] }));

  if (toEnrich.length === 0) return infoItems;

  // 2. Batch embed (1 seul appel API)
  const texts = toEnrich.map(i => `${i.subject}. ${i.content || ''}`);
  const embedResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
    dimensions: 1536,
  });

  // 3. Recherche RAG parallèle
  const enriched = await Promise.all(
    toEnrich.map(async (item, idx) => {
      const embedding = embedResponse.data[idx].embedding;

      const { data: matches } = await supabase.rpc('match_documents_v14', {
        query_embedding: embedding,
        match_count: 2,
        similarity_threshold: 0.45,
        filter_org_id: orgId,
        filter_project_id: projectId,
        filter_layer: 'project',
        include_app_layer: false,
      });

      // Exclure les chunks issus de meetings
      const filtered = (matches || []).filter(
        (m: any) => m.metadata?.source_type !== 'meeting'
      );

      const rag_context: RagContext[] = filtered.map((m: any) => ({
        source_file_name: m.source_file_name || 'Document inconnu',
        page_start: m.page_start || null,
        page_end: m.page_end || null,
        excerpt: (m.content || '').substring(0, 150),
        similarity: m.similarity,
      }));

      return { ...item, rag_context };
    })
  );

  return [...enriched, ...infoItems];
}
```

### CORS headers (identique aux autres EF)

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
```

### Client Supabase

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

### Auth JWT (vérifier l'utilisateur)

```typescript
const authHeader = req.headers.get("Authorization");
if (!authHeader) return jsonResponse({ error: "Missing authorization" }, 401);

const token = authHeader.replace("Bearer ", "");
const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
if (authErr || !user) return jsonResponse({ error: "Unauthorized" }, 401);

// Récupérer le profil pour org_id
const { data: profile } = await supabase
  .schema("core")
  .from("profiles")
  .select("org_id")
  .eq("id", user.id)
  .single();
```

### Import map (fichier partagé existant)

```json
{
  "imports": {
    "openai": "npm:openai@^4.0.0",
    "@supabase/supabase-js": "npm:@supabase/supabase-js@^2.0.0"
  }
}
```

### Secrets Supabase disponibles

- `SUPABASE_URL` (auto)
- `SUPABASE_SERVICE_ROLE_KEY` (auto)
- `OPENAI_API_KEY` (existe, utilisé par meeting-extract)

---

## Génération PDF

**Approche choisie : Markdown → PDF simple.**

Pour Deno Edge Functions, les options légères sont :
- **jsPDF** : `npm:jspdf` — génération PDF programmatique, pas de DOM requis
- **pdfkit** : pas compatible Deno facilement

**Approche recommandée avec jsPDF :**
1. Parser le markdown (sections, tableaux, listes)
2. Écrire ligne par ligne dans jsPDF avec formatting basique
3. Header avec nom entreprise + date
4. Footer "Généré par ARPET"
5. Upload le buffer PDF résultant

**Alternative si jsPDF pose problème en Deno :**
- Stocker le markdown brut (mime_type: 'text/markdown')
- Le frontend convertira en PDF côté client (html2pdf.js)
- Dans ce cas, retourner `mime_type: 'text/markdown'` et adapter le frontend

---

## Contraintes

- **verify_jwt: true** (authentification requise)
- **Pas d'ingestion RAG** : les documents générés sont de la GED pure (consultation/téléchargement)
- **ingestion_level: 'none'** dans sources.files
- **Timeout** : les Edge Functions Supabase ont un timeout de 60s. Budget estimé :
  - Collecte DB : ~1s
  - Batch embed (20 items) : ~500ms
  - 20 RPC match_documents_v14 parallèles : ~1-3s
  - Appel GPT-4o (prompt enrichi) : ~10-20s
  - Stockage : ~1s
  - **Total estimé : 15-25s** (dans le budget 60s)
- **metadata.category** : utiliser le slug `'documents_generes'` (pas l'UUID)
- **Bucket Storage** : `user-workspace` (policy RLS déjà en place pour lecture projet)
- **Enrichissement RAG graceful** : si l'embed ou la recherche échoue, continuer sans contexte contractuel (pas de crash)
- **Pas de stockage des liens RAG en DB** : l'enrichissement est calculé à chaque génération (toujours à jour)

---

## Résultat attendu

Une Edge Function `generate-document` déployable dans Supabase qui :
1. Reçoit `{ project_id, document_type, lot_filter? }`
2. Collecte les données pertinentes du projet (meetings, items, intervenants)
3. **Enrichit les items (decision/action/issue) avec le contexte contractuel** via recherche RAG à la volée (`match_documents_v14`)
4. Génère un document Markdown structuré via GPT-4o (items + références contractuelles)
5. Stocke le Markdown dans Storage (`user-workspace`) + `sources.files`
6. Retourne `{ file_id, file_name, download_url, doc_type }`

Le frontend (déjà implémenté) :
- Appelle cette EF via le bouton "Générer" dans DocumentsPage > catégorie "Documents Générés"
- Affiche le preview via `MarkdownViewer` dans le split panel
- Exporte en PDF à la volée côté client (`html2pdf.js`) au téléchargement

### Changements frontend requis

**Aucun.** L'enrichissement RAG est entièrement côté EF. Le frontend reçoit le même format de réponse. Le Markdown généré contient directement les références contractuelles — le `MarkdownViewer` les affiche tel quel.
