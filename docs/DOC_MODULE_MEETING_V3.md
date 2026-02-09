# Documentation Module Meeting V3 — ARPET

> Documentation complète du module Réunion, basée sur l'audit du code source et des spécifications.
> Dernière mise à jour : 2026-02-07

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture générale](#2-architecture-générale)
3. [Base de données](#3-base-de-données)
4. [Types TypeScript](#4-types-typescript)
5. [Services](#5-services)
6. [Composants Frontend](#6-composants-frontend)
7. [Intégrations transversales](#7-intégrations-transversales)
8. [Edge Functions (Backend)](#8-edge-functions-backend)
9. [Flux utilisateur complets](#9-flux-utilisateur-complets)
10. [Audit sécurité & recommandations](#10-audit-sécurité--recommandations)
11. [Inventaire des fichiers](#11-inventaire-des-fichiers)

---

## 1. Vue d'ensemble

### Objectif

Le module Meeting V3 transforme les réunions de chantier en intelligence interrogeable. Il capture l'audio (enregistrement live, import fichier, mémo vocal), le transcrit via Gladia, en extrait des items structurés (décisions, actions, problèmes) via GPT-4o, puis ingère le tout dans le moteur RAG BAIKAL pour permettre des requêtes contextuelles.

### Fonctionnalités principales

| Fonctionnalité | Description |
|---|---|
| **3 modes de capture** | Enregistrement live, import audio (mp3/m4a/wav/webm/ogg, 500MB max), mémo vocal (3s min) |
| **Transcription** | Gladia API (async, FR, diarisation multi-speakers) |
| **Extraction LLM** | GPT-4o : items structurés + compte-rendu formaté |
| **Speaker Mapping** | Mapping interactif speakers Gladia → intervenants projet |
| **Ingestion RAG** | Chunking par topic (L0 résumé + L1 détails), embeddings 1536 dim |
| **Historique** | Page `/app/reunions` avec liste meetings, filtres, accordion |
| **Dashboard Actions** | Vue cross-meetings des décisions/actions/problèmes, filtres, statuts inline |
| **Documents Générés** | Mémo chantier + Fiche Lot, Markdown source de vérité, export PDF à la volée |

### Stack technique

| Couche | Technologie |
|---|---|
| Transcription | Gladia API (async, pre-recorded, FR, $0.61/h) |
| Extraction | OpenAI GPT-4o (configurable via secret `EXTRACTION_MODEL`) |
| Ingestion RAG | OpenAI text-embedding-3-small (1536 dim) |
| Génération docs | OpenAI GPT-4o (prompt structuré par type) |
| Export PDF | html2pdf.js (côté client, A4, 15mm margins) |
| Storage audio | Supabase Storage bucket `project-recordings` |
| Storage transcripts | Supabase Storage bucket `meeting-transcripts` |
| Storage documents | Supabase Storage bucket `user-workspace` |

---

## 2. Architecture générale

### Diagramme de flux

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAPTURE (Frontend)                       │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Enregistrement│  │ Import Audio │  │ Mémo Vocal   │          │
│  │ MeetingStep2  │  │ MeetingUpload│  │ MemoRecorder │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────┬───────┘──────────────────┘                 │
│                    ▼                                             │
│           processAudio() → upload Storage                       │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TRAITEMENT (Edge Functions)                    │
│                                                                 │
│  ┌───────────────────┐     ┌───────────────────┐               │
│  │ meeting-transcribe │────▶│ meeting-extract   │               │
│  │ (Gladia API)       │     │ (GPT-4o)          │               │
│  │                    │     │                    │               │
│  │ audio → transcript │     │ transcript → items │               │
│  │ status: transcribed│     │ + CR + vectorize   │               │
│  └───────────────────┘     │ status: done       │               │
│                            └───────────────────┘               │
└────────────────────┬────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPLOITATION (Frontend)                       │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Step3 Review  │  │ Historique   │  │ Dashboard    │          │
│  │ + Speaker Map │  │ MeetingHist. │  │ Items/Actions│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ Generate Doc  │  │ Chat RAG     │                             │
│  │ Mémo/Fiche   │  │ (baikal-     │                             │
│  │ → PDF export  │  │  retrieval)  │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

### Pipeline extraction_status

```
pending → [meeting-transcribe] → transcribed → [meeting-extract] → done
              ↘ error                              ↘ error
```

### Architecture des fichiers

```
src/
├── components/meeting/           # 13 fichiers — Composants UI
│   ├── index.ts                  # Barrel exports (10 composants)
│   ├── MeetingRecordModal.tsx    # Modal principal (orchestration 3 modes)
│   ├── MeetingStep1Prepare.tsx   # Étape 1 : métadonnées (titre, participants)
│   ├── MeetingStep2Record.tsx    # Étape 2 : enregistrement live
│   ├── MeetingStep3Review.tsx    # Étape 3 : résultats (4 onglets)
│   ├── MeetingProgressIndicator.tsx  # Indicateur 4 étapes (upload→done)
│   ├── MeetingUpload.tsx         # Drag & drop audio
│   ├── MemoRecorder.tsx          # Enregistrement mémo simplifié
│   ├── MemoModal.tsx             # Modale mémo standalone (depuis ChatInput)
│   ├── SpeakerMapping.tsx        # Mapping speakers → intervenants
│   ├── ReunionsPage.tsx          # Page /app/reunions (wrapper 2 onglets)
│   ├── MeetingHistoryTab.tsx     # Onglet historique meetings
│   └── MeetingItemsTab.tsx       # Onglet dashboard actions/décisions
│
├── services/
│   ├── meeting.service.ts        # v4.0.0 — Service principal (CRUD, helpers)
│   ├── meeting-items.service.ts  # v1.0.0 — Requêtes cross-meetings
│   ├── meeting-documents.service.ts  # v2.0.0 — Génération docs
│   └── intervenants.service.ts   # v1.0.0 — CRUD intervenants
│
├── types/
│   ├── meeting.types.ts          # Types, constantes, helpers meeting
│   ├── intervenant.types.ts      # Types intervenants
│   ├── meeting-document.types.ts # Types documents générés
│   └── index.ts                  # Re-exports centralisés
│
├── utils/
│   └── markdown-to-pdf.ts        # Conversion Markdown → PDF (html2pdf.js)
│
├── components/documents/
│   └── GenerateDocZone.tsx        # UI génération docs (mémo + fiche lot)
│
├── components/viewer/
│   └── MarkdownViewer.tsx         # Rendu Markdown dans le viewer
│
└── pages/
    └── Reunions.tsx               # Page wrapper route /app/reunions
```

---

## 3. Base de données

### Schéma `arpet` — Tables meetings

#### `arpet.meetings` (23 colonnes)

| Colonne | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | Clé primaire |
| `org_id` | uuid | NO | — | Organisation (multi-tenant) |
| `project_id` | uuid | YES | — | Projet/chantier associé |
| `meeting_date` | date | NO | — | Date de la réunion |
| `meeting_title` | text | YES | — | Titre (auto-généré ou saisi) |
| `duration_minutes` | integer | YES | — | Durée en minutes |
| `participants` | jsonb | YES | `'[]'` | Array `MeetingParticipantEnriched[]` |
| `source_type` | varchar | NO | `'manual'` | Type de source (voir CHECK) |
| `source_file_id` | uuid | YES | — | Référence fichier source |
| `audio_url` | text | YES | — | URL audio (signed) |
| `storage_bucket` | text | YES | `'project-recordings'` | Bucket Storage |
| `storage_path` | text | YES | — | Chemin dans le bucket |
| `summary` | text | YES | — | Résumé extrait par LLM |
| `formatted_report` | text | YES | — | Compte-rendu formaté (Markdown) |
| `next_meeting_date` | timestamptz | YES | — | Prochaine réunion prévue |
| `transcript_path` | text | YES | — | Chemin transcript JSON dans Storage |
| `extraction_status` | varchar | NO | `'pending'` | Statut du pipeline (voir CHECK) |
| `extraction_error` | text | YES | — | Message d'erreur si échec |
| `model_used` | text | YES | — | Modèle LLM utilisé |
| `shared_with_team` | boolean | YES | `true` | Partagé avec l'équipe |
| `created_by` | uuid | YES | — | Utilisateur créateur |
| `created_at` | timestamptz | NO | `now()` | Date création |
| `updated_at` | timestamptz | NO | `now()` | Date mise à jour |

**Contraintes CHECK :**

| Contrainte | Valeurs |
|---|---|
| `meetings_source_type_check` | `'recording'`, `'uploaded_cr'`, `'manual'`, `'uploaded_audio'`, `'visio_bot'`, `'memo'` |
| `meetings_extraction_status_check` | `'pending'`, `'processing'`, `'transcribed'`, `'extracted'`, `'done'`, `'error'` |

#### `arpet.meeting_items` (18 colonnes)

| Colonne | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | Clé primaire |
| `meeting_id` | uuid | NO | — | FK → meetings.id |
| `item_type` | varchar | NO | — | `'decision'` / `'action'` / `'issue'` / `'info'` |
| `subject` | text | NO | — | Sujet de l'item |
| `content` | text | NO | — | Contenu détaillé |
| `context` | text | YES | — | Contexte de discussion |
| `lot_reference` | text | YES | — | Référence lot BTP |
| `responsible` | text | YES | — | Responsable assigné |
| `due_date` | date | YES | — | Échéance |
| `status` | varchar | NO | `'open'` | `'open'` / `'in_progress'` / `'done'` / `'cancelled'` |
| `status_updated_at` | timestamptz | YES | — | Dernière mise à jour statut |
| `status_updated_by` | uuid | YES | — | Utilisateur ayant mis à jour |
| `display_order` | integer | YES | `0` | Ordre d'affichage |
| `location` | text | YES | — | Localisation (résidence, zone) |
| `topic_tags` | text[] | YES | `'{}'` | Tags thématiques |
| `related_documents` | text[] | YES | `'{}'` | Documents liés |
| `created_at` | timestamptz | NO | `now()` | Date création |
| `updated_at` | timestamptz | NO | `now()` | Date mise à jour |

#### `arpet.meetings_with_permissions` (Vue)

Vue SQL calculant les permissions utilisateur par meeting (accès basé sur rôle projet).

### Schéma `core` — Tables intervenants

#### `core.intervenants` (11 colonnes)

| Colonne | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | Clé primaire |
| `org_id` | uuid | NO | — | Organisation |
| `name` | text | NO | — | Nom complet |
| `company` | text | YES | — | Entreprise |
| `role` | text | YES | — | Rôle / fonction |
| `email` | text | YES | — | Email |
| `phone` | text | YES | — | Téléphone |
| `specialty` | text | YES | — | Spécialité BTP |
| `created_by` | uuid | YES | — | Créateur |
| `created_at` | timestamptz | NO | `now()` | Date création |
| `updated_at` | timestamptz | NO | `now()` | Date mise à jour |

#### `core.projet_intervenants` (6 colonnes)

| Colonne | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | Clé primaire |
| `project_id` | uuid | NO | — | FK → projects.id |
| `intervenant_id` | uuid | NO | — | FK → intervenants.id |
| `lot_reference` | text | YES | — | Lot attribué |
| `role_in_project` | text | YES | — | Rôle spécifique au projet |
| `created_at` | timestamptz | NO | `now()` | Date création |

**Contrainte UNIQUE :** `(project_id, intervenant_id)`

### RLS Policies

#### `arpet.meetings` — 8 policies (2 générations)

**Policies legacy (org_id based) :**

| Policy | Commande | Logique |
|---|---|---|
| Users can view meetings of their org | SELECT | org_id = user.org_id OR super_admin (NULL org_id) |
| Users can insert meetings in their org | INSERT | Idem |
| Users can update meetings in their org | UPDATE | Idem |
| Creator or admin can delete meetings | DELETE | created_by = auth.uid() OR super_admin |
| Service role full access meetings | ALL | `true` |

**Policies V2 (fonctions `core.rls_*`) :**

| Policy | Commande | Logique |
|---|---|---|
| meetings_select_project_members | SELECT | super_admin OR org_admin + same org OR project member OR creator |
| meetings_update_creator_or_leader | UPDATE | super_admin OR org_admin + same org OR project leader OR creator |
| meetings_delete_creator_or_leader | DELETE | Idem |
| meetings_insert_authenticated | INSERT | auth.uid() IS NOT NULL AND created_by = auth.uid() |

#### `arpet.meeting_items` — 5 policies

| Policy | Commande | Logique |
|---|---|---|
| Service role full access | ALL | `true` |
| View via meeting | SELECT | Cascade via meeting.org_id |
| Insert via meeting | INSERT | Idem |
| Update via meeting | UPDATE | Idem |
| Delete via meeting | DELETE | Idem |

#### `core.intervenants` — 4 policies

Toutes scoped par `org_id = user.org_id` (SELECT, INSERT, UPDATE, DELETE).

#### `core.projet_intervenants` — 3 policies

Scoped via JOIN sur project.org_id (SELECT, INSERT, DELETE). **Pas de policy UPDATE.**

### Migrations appliquées

| Version | Nom | Description |
|---|---|---|
| 20260205013102 | `meeting_v3_enrich_source_type` | Ajout `'uploaded_audio'`, `'visio_bot'`, `'memo'` au CHECK |
| 20260205013112 | `meeting_v3_add_meeting_items_columns` | Colonnes `location`, `topic_tags`, `related_documents` |
| 20260205013124 | `meeting_v3_enrich_extraction_status` | Ajout `'transcribed'`, `'extracted'` au CHECK |
| 20260205013134 | `meeting_v3_add_documents_generes_category` | Catégorie `'documents_generes'` (sort_order 75) |
| 20260207061720 | `storage_user_workspace_project_read_policy` | RLS Storage pour fichiers projet dans `user-workspace` |

### Données actuelles

| Table | Count |
|---|---|
| `arpet.meetings` | 16 |
| `arpet.meeting_items` | 28 |

### Storage Buckets

| Bucket | Public | Usage |
|---|---|---|
| `project-recordings` | **Oui** | Audio meetings (enregistrements, imports) |
| `meeting-transcripts` | Non | Transcripts JSON Gladia |
| `user-workspace` | Non | Documents générés (Markdown) |

---

## 4. Types TypeScript

### `src/types/meeting.types.ts`

#### Types de base

```typescript
// Sources de capture
type MeetingSourceType =
  | 'recording'        // Enregistrement live
  | 'uploaded_audio'   // Fichier audio importé
  | 'visio_bot'        // Bot Recall.ai (visioconférence)
  | 'memo'             // Mémo vocal rapide
  | 'uploaded_cr'      // CR uploadé (legacy)
  | 'manual'           // Saisie manuelle (legacy)

// Étapes du modal
type MeetingStep = 'prepare' | 'record' | 'processing' | 'review'

// Statuts frontend (UI flow)
type MeetingProcessingStatus =
  'idle' | 'uploading' | 'transcribing' | 'transcribed'
  | 'analyzing' | 'completed' | 'error'

// Statuts backend (DB)
type MeetingExtractionStatus =
  'pending' | 'processing' | 'transcribed' | 'extracted' | 'done' | 'error'

// Types d'items extraits
type MeetingItemType = 'decision' | 'action' | 'issue' | 'info'

// Statuts d'items
type MeetingItemStatus = 'open' | 'in_progress' | 'done' | 'cancelled'
```

#### Interfaces principales

| Interface | Propriétés clés | Usage |
|---|---|---|
| `Meeting` | 23 champs (miroir DB) | Record complet meeting |
| `MeetingItem` | 18 champs (miroir DB) | Item extrait (décision/action/issue/info) |
| `MeetingParticipantEnriched` | speaker_id, name, role, company, intervenant_id, confidence, matched_by | Participant mappé |
| `MeetingPrepareData` | title, participants, agenda, source_type, project_id, org_id | Données étape 1 |
| `MemoExtraction` | subject, tags, actions, lot_reference, location | Extraction légère memo |
| `TranscribeResponse` | success, meeting_id, transcript_text, speakers_count, transcript_path | Réponse EF transcribe |
| `ExtractResponse` | success, meeting_id, summary, items_count, items, formatted_report | Réponse EF extract |
| `ProcessAudioResponse` | success, meeting_id, transcript, summary, action_items, audio_url | Réponse legacy (compat) |

#### Constantes UI

| Constante | Type | Contenu |
|---|---|---|
| `MEETING_PROCESSING_LABELS` | `Record<MeetingProcessingStatus, string>` | Labels FR pour chaque statut |
| `SOURCE_TYPE_LABELS` | `Record<MeetingSourceType, string>` | Labels FR sources |
| `SOURCE_TYPE_ICONS` | `Record<MeetingSourceType, string>` | Emojis par source |
| `ACCEPTED_AUDIO_FORMATS` | `string[]` | MIME types acceptés (7 formats) |
| `ACCEPTED_AUDIO_EXTENSIONS` | `string` | `.mp3,.m4a,.wav,.webm,.ogg` |

#### Helpers

| Fonction | Signature | Description |
|---|---|---|
| `formatMeetingDuration` | `(seconds) => string` | Formate en mm:ss ou hh:mm:ss |
| `generateMeetingDefaultTitle` | `() => string` | "Réunion du DD/MM/YYYY à HH:MM" |
| `generateMemoDefaultTitle` | `() => string` | "Mémo du DD/MM/YYYY à HH:MM" |
| `isAcceptedAudioFormat` | `(mimeType) => boolean` | Validation MIME type |
| `isMemoType` | `(sourceType) => boolean` | Vérifie si `'memo'` |
| `needsDiarization` | `(sourceType) => boolean` | Tout sauf `'memo'` |

### `src/types/intervenant.types.ts`

| Interface | Propriétés clés | Usage |
|---|---|---|
| `Intervenant` | id, org_id, name, company, role, email, phone, specialty | Contact externe |
| `ProjetIntervenant` | project_id, intervenant_id, lot_reference, role_in_project | Liaison projet ↔ intervenant |
| `IntervenantWithProjectRole` | Extends Intervenant + lot_reference, role_in_project, projet_intervenant_id | Vue enrichie pour mapping |
| `CreateIntervenantInput` | name, company?, role?, email?, phone?, specialty? | Payload création |
| `LinkIntervenantInput` | intervenant_id, project_id, lot_reference?, role_in_project? | Payload liaison |

### `src/types/meeting-document.types.ts`

| Type/Interface | Description |
|---|---|
| `GeneratedDocType` | `'memo_chantier'` / `'fiche_lot'` |
| `GenerateDocRequest` | project_id, doc_type, lot_reference? |
| `GeneratedDocResponse` | file_id, file_name, download_url, doc_type |
| `ProjectLot` | lot_reference, intervenant_name, company |
| `GENERATED_DOC_CONFIG` | Config UI : label, description, icône par type |

---

## 5. Services

### `meeting.service.ts` (v4.0.0)

Service principal du module meeting. Gère le CRUD meetings/items et les helpers UI.

#### Fonctions exportées

| Fonction | Signature | Description |
|---|---|---|
| `processAudio` | `(audioBlob, prepareData, onStatusChange?) → ServiceResult<ProcessAudioResponse>` | Upload audio + appel Edge Function transcription/extraction |
| `uploadAudioFile` | `(file, projectId, orgId) → ServiceResult<{storagePath, signedUrl}>` | Upload vers bucket `project-recordings` |
| `getMeetingHistory` | `(projectId, options?) → ServiceResult<Meeting[]>` | Liste meetings d'un projet (filtres source_type, tri date DESC) |
| `getMeetingById` | `(meetingId) → ServiceResult<Meeting>` | Détails complets d'un meeting |
| `getMeetingItems` | `(meetingId) → ServiceResult<MeetingItem[]>` | Items d'un meeting (tri display_order) |
| `updateMeetingItem` | `(itemId, updates) → ServiceResult<MeetingItem>` | Mise à jour item (statut, responsable, échéance...) |
| `updateMeetingParticipants` | `(meetingId, participants) → ServiceResult<Meeting>` | Sauvegarde mapping speakers |
| `parseTranscriptSpeakers` | `(transcript) → TranscriptSpeaker[]` | Parse transcript JSON → speakers distincts + count |
| `buildColorizedTranscript` | `(transcript, participantMap) → TranscriptSegment[]` | Segments colorisés par speaker |
| `generateDefaultTitle` | `() → string` | Titre par défaut |
| `groupItemsByType` | `(items) → {decisions, actions, issues, infos}` | Regroupement par type |
| `getItemTypeIcon/Label/Color` | `(type) → string / {bg,text,border}` | Helpers UI items |
| `getSourceTypeIcon/Label` | `(sourceType) → string` | Helpers UI sources |

**Constantes :** `SPEAKER_COLORS` (8 couleurs), `AUDIO_STORAGE_BUCKET`, `MEETING_PROCESSING_LABELS`

**Queries Supabase :**
- Tables : `meetings` (SELECT/INSERT/UPDATE), `meeting_items` (SELECT/UPDATE)
- Storage : bucket `project-recordings` (upload, signed URLs 24h)

### `meeting-items.service.ts` (v1.0.0)

Service dédié aux requêtes cross-meetings sur les items.

| Fonction | Signature | Description |
|---|---|---|
| `getProjectMeetingItems` | `(projectId, filters?) → ServiceResult<MeetingItemWithContext[]>` | Items cross-meetings avec JOIN context |
| `getItemsStats` | `(projectId) → ServiceResult<MeetingItemsStats>` | Stats agrégées (total, par type, par statut, retards) |
| `getOverdueActions` | `(projectId) → ServiceResult<MeetingItemWithContext[]>` | Raccourci items en retard |
| `isItemOverdue` | `(item) → boolean` | Check `due_date < today AND status open/in_progress` |

**Types retour :**
- `MeetingItemWithContext` : MeetingItem + `meeting_title` + `meeting_date`
- `MeetingItemsStats` : `{ total, by_type, by_status, overdue_count }`
- `MeetingItemFilters` : item_type, status, lot_reference, responsible, overdue_only, search

**Query Supabase :** JOIN `meeting_items` → `meetings!inner()` avec filtres dynamiques.

### `meeting-documents.service.ts` (v2.0.0)

Service de génération et export de documents.

| Fonction | Signature | Description |
|---|---|---|
| `generateDocument` | `(projectId, docType, options?) → ServiceResult<GeneratedDocResponse>` | Appel Edge Function `generate-document` |
| `downloadAsPdf` | `(bucket, storagePath, filename) → {error}` | Fetch .md → conversion PDF → téléchargement navigateur |
| `getProjectLots` | `(projectId) → ServiceResult<ProjectLot[]>` | Lots distincts du projet avec info intervenant |

**Edge Function invoquée :** `generate-document` avec body `{ project_id, document_type, lot_filter? }`

**Dépendance :** `convertMarkdownToPdf()` de `utils/markdown-to-pdf.ts`

### `intervenants.service.ts` (v1.0.0)

CRUD intervenants (contacts externes du projet).

| Fonction | Signature | Description |
|---|---|---|
| `getProjectIntervenants` | `(projectId) → ServiceResult<IntervenantWithProjectRole[]>` | Intervenants liés au projet (JOIN enrichi) |
| `getOrgIntervenants` | `() → ServiceResult<Intervenant[]>` | Tous les intervenants de l'organisation |
| `searchIntervenants` | `(query) → ServiceResult<Intervenant[]>` | Recherche ILIKE nom/entreprise (limit 20) |
| `createIntervenant` | `(input) → ServiceResult<Intervenant>` | Création intervenant dans l'org |
| `linkIntervenantToProject` | `(intervenantId, projectId, lotRef?, role?) → ServiceResult<ProjetIntervenant>` | Liaison intervenant ↔ projet |
| `unlinkIntervenantFromProject` | `(projetIntervenantId) → ServiceResult<void>` | Suppression liaison |
| `createAndLinkIntervenant` | `(input, projectId, lotRef?, role?) → ServiceResult<IntervenantWithProjectRole>` | Composite : création + liaison |

**Queries Supabase :** Schéma `core` — tables `intervenants` et `projet_intervenants`.

---

## 6. Composants Frontend

### Arbre de dépendances

```
MeetingRecordModal (parent)
├── ModeSelector (nested inline)
├── MeetingUpload
├── MeetingStep1Prepare
├── MeetingStep2Record
│   └── useAudioRecorder hook
├── MeetingStep3Review
│   ├── SpeakerMapping
│   │   └── intervenants.service
│   ├── TabButton (nested inline)
│   └── ItemSection (nested inline)
├── MemoRecorder
│   └── useAudioRecorder hook
└── MeetingProgressIndicator

MemoModal (standalone)
└── MemoRecorder

ReunionsPage (page /app/reunions)
├── MeetingHistoryTab
└── MeetingItemsTab

GenerateDocZone (dans DocumentsPage)
└── meeting-documents.service

MarkdownViewer (dans SplitViewPanel)
```

### Détail des composants

#### `MeetingRecordModal` — Modal principal

**Fichier :** `src/components/meeting/MeetingRecordModal.tsx`
**Version :** 4.0.0

Orchestre le workflow complet d'enregistrement meeting via un state machine à 7 étapes :

```
mode-select → prepare → upload|record|memo → processing → review
```

**Props :** `{ isOpen, onClose }`

**State principal :**
- `step` : étape courante du flow
- `captureMode` : `'recording'` / `'uploaded_audio'` / `'memo'`
- `prepareData` : données de préparation (titre, participants, agenda)
- `uploadedFile` : fichier audio importé
- `processingStatus` : état du traitement (upload → transcribe → analyze → done)
- `result` : réponse de `processAudio()`

**Comportement :**
1. **Mode Select** : 3 cartes cliquables (Enregistrer / Importer / Mémo)
2. **Prepare** : saisie titre + optionnel (participants, agenda)
3. **Capture** : rendu conditionnel selon le mode choisi
4. **Processing** : indicateur de progression 4 étapes
5. **Review** : résultats avec 4 onglets

#### `MeetingStep1Prepare` — Métadonnées

**Fichier :** `src/components/meeting/MeetingStep1Prepare.tsx`
**Version :** 4.0.0

Collecte le titre (obligatoire) et optionnellement participants + agenda. Section avancée repliable. Génère un titre par défaut si non renseigné. S'adapte visuellement au mode (record vs upload).

**Props :** `{ onNext, onCancel, disabled?, mode?, uploadedFileName? }`

#### `MeetingStep2Record` — Enregistrement live

**Fichier :** `src/components/meeting/MeetingStep2Record.tsx`
**Version :** 4.0.0

Utilise le hook `useAudioRecorder` pour capturer l'audio du microphone. Auto-démarre l'enregistrement au montage. Durée minimum : 5 secondes. Affiche un timer monospace avec indicateur animé.

**Props :** `{ prepareData, onComplete, onBack }`

#### `MeetingStep3Review` — Résultats & Mapping

**Fichier :** `src/components/meeting/MeetingStep3Review.tsx`
**Version :** 4.0.0

Affiche les résultats d'extraction dans 4 onglets :
1. **Résumé** : résumé LLM + badges compteurs + copie CR clipboard
2. **Intervenants** : mapping speakers (conditionnel si multi-speakers)
3. **Décisions & Actions** : items groupés par type, sections dépliables
4. **Transcript** : transcript colorisé par speaker avec noms mappés

**Props :** `{ prepareData, processingStatus, result, error, projectId, onAddToSandbox, onClose }`

#### `MeetingUpload` — Import audio

**Fichier :** `src/components/meeting/MeetingUpload.tsx`

Zone drag & drop + file picker. Formats acceptés : MP3, M4A, WAV, WebM, OGG. Taille : 1 KB min, 500 MB max. Validation MIME type + fallback extension. Aperçu fichier sélectionné avec option de retrait.

**Props :** `{ onFileSelected, onCancel, disabled?, selectedFile?, onFileRemove? }`

#### `MemoRecorder` — Mémo vocal

**Fichier :** `src/components/meeting/MemoRecorder.tsx`

Enregistrement simplifié pour notes vocales personnelles. Durée minimum : 3 secondes. UI minimaliste avec icône animée state-aware. Gestion permissions micro.

**Props :** `{ onRecordingComplete, onCancel, disabled? }`

#### `MemoModal` — Modale mémo standalone

**Fichier :** `src/components/meeting/MemoModal.tsx`

Wrapper modal pour mémo vocal, utilisable depuis ChatInput. Auto-titre "Mémo du [date] à [heure]". Flow simplifié : record → processing → success/error. Callback `onSuccess(meetingId)` pour actions post-enregistrement.

**Props :** `{ isOpen, onClose, projectId, orgId, projectName?, onSuccess? }`

#### `SpeakerMapping` — Identification speakers

**Fichier :** `src/components/meeting/SpeakerMapping.tsx`

Interface de mapping des speakers Gladia vers les intervenants du projet. Pour chaque speaker : nom + rôle + entreprise (pré-remplis si intervenant sélectionné). Dropdown searchable avec liste des intervenants existants + option de création inline. Persistance DB via `updateMeetingParticipants()` + `createAndLinkIntervenant()`.

**Props :** `{ speakers, projectId, meetingId, existingParticipants?, onMappingComplete, onSkip }`

#### `MeetingProgressIndicator` — Progression

**Fichier :** `src/components/meeting/MeetingProgressIndicator.tsx`

Indicateur linéaire 4 étapes : Envoi → Transcription → Analyse → Terminé. Spinner sur l'étape active, checkmark sur les complétées, alerte sur erreur. Composant pur (pas de state).

**Props :** `{ status, className? }`

#### `ReunionsPage` — Page principale

**Fichier :** `src/components/meeting/ReunionsPage.tsx`

Container pour la page `/app/reunions`. 2 onglets : Historique / Actions & Décisions. Vérifie `activeProject` du store (état vide si aucun projet). Bouton refresh global.

#### `MeetingHistoryTab` — Liste meetings

**Fichier :** `src/components/meeting/MeetingHistoryTab.tsx`

Liste tous les meetings du projet avec :
- **Filtres** par source_type (All, Recording, Import, Memo, Visio)
- **Cartes meeting** : icône source, titre, date, durée, nb participants, nb items, badge statut extraction
- **Accordion dépliable** : résumé, participants, erreur extraction
- **Batch query** pour les compteurs d'items par meeting

**Props :** `{ projectId, refreshKey }`

#### `MeetingItemsTab` — Dashboard actions

**Fichier :** `src/components/meeting/MeetingItemsTab.tsx`

Vue cross-meetings des items extraits avec :
- **Barre stats cliquable** : total + compteur par type + retards (rouge)
- **Filtres** : type, statut, lot (dropdown), responsable (dropdown), recherche texte
- **Liste items** : icône type, sujet, métadonnées (responsable/lot/échéance/réunion d'origine)
- **Statut inline** : dropdown modifiable avec update optimiste
- **Détection retard** : bordure rouge + badge "RETARD" si due_date < aujourd'hui et statut ouvert

**Props :** `{ projectId, refreshKey }`

---

## 7. Intégrations transversales

### Routes

| Fichier | Ligne | Intégration |
|---|---|---|
| `src/App.tsx` | 124 | Route `<Route path="reunions" element={<Reunions />} />` sous `/app` |
| `src/pages/Reunions.tsx` | 8-10 | Wrapper simple → `<ReunionsPage />` |

### Navigation (Sidebar)

| Fichier | Lignes | Intégration |
|---|---|---|
| `SidebarNavigation.tsx` | 49-55 | NavItem "Reunions" (icône ClipboardList) → `/app/reunions` |
| `SidebarNavigation.tsx` | 65-72 | Bouton "Enregistrer" (icône Video, amber) → ouvre `MeetingRecordModal` |

### Chat (ChatInput)

| Fichier | Lignes | Intégration |
|---|---|---|
| `ChatInput.tsx` | 189-200 | Bouton micro → ouvre `MemoModal` (désactivé si pas de projet) |
| `ChatInput.tsx` | 273-279 | `<MemoModal>` avec props projectId, orgId, projectName |

### Viewer (documents générés)

| Fichier | Lignes | Intégration |
|---|---|---|
| `SplitViewPanel.tsx` | 142-150 | Rendu `<MarkdownViewer>` pour type `'markdown'` |
| `viewer.types.ts` | 77-83 | Détection `.md`/`.markdown`/`.txt` → type `'markdown'` |
| `MarkdownViewer.tsx` | 117-204 | Fetch signed URL → parse Markdown → rendu HTML |

### Documents (GED)

| Fichier | Lignes | Intégration |
|---|---|---|
| `DocumentRow.tsx` | 120-131 | Détection `.md` → `downloadAsPdf()` au lieu du téléchargement classique |
| `GenerateDocZone.tsx` | 66-124 | Génération + preview auto via `openViewer()` |

### State Management

| Store | Données | Usage meeting |
|---|---|---|
| `appStore` → `activeProject` | Projet actif | Contexte obligatoire pour toutes les opérations meeting |
| `appStore` → viewer slice | viewerOpen, viewerDocument | Ouverture documents générés dans le viewer |

### Auth

| Hook | Données | Usage meeting |
|---|---|---|
| `useAuth()` → `profile` | org_id, id | Fallback org_id dans MeetingRecordModal |

---

## 8. Edge Functions (Backend)

> Les Edge Functions sont dans le repo **Frontend-Baikal** (`supabase/functions/`).

### `meeting-transcribe` (4 fichiers)

| Fichier | Rôle |
|---|---|
| `index.ts` | Handler principal, orchestration du flux |
| `gladia.ts` | Client Gladia API (upload, poll, custom vocabulary) |
| `storage.ts` | Upload transcript JSON vers Storage |
| `types.ts` | Types Gladia |

**Flux :**
1. Récupère audio depuis Storage (signed URL)
2. Envoie à Gladia (async, FR, diarisation activée)
3. Poll jusqu'à completion (max 30 tentatives, 10s intervalle)
4. Parse utterances → format interne
5. Upload transcript JSON dans Storage (`meeting-transcripts` bucket)
6. Update meeting : `extraction_status = 'transcribed'`

**Custom vocabulary :** Construit à partir des intervenants et concepts du projet (via `rag.documents`).

### `meeting-extract` (5 fichiers)

| Fichier | Rôle |
|---|---|
| `index.ts` | Handler principal, orchestration |
| `extraction.ts` | Appel GPT-4o pour extraction structurée |
| `template.ts` | Lookup template CR (org → fallback ARPET) |
| `vectorize.ts` | Chunking + embedding (aligné ingest-documents v8.0.0) |
| `types.ts` | Types extraction |

**Flux :**
1. Récupère transcript JSON depuis Storage
2. Lookup template CR (layer org, catégorie `'modeles'`)
3. Appel GPT-4o avec prompt structuré → items + CR formaté
4. Insert items dans `arpet.meeting_items`
5. Update participants avec speaker labels
6. **Vectorisation** : chunks par topic (L0 résumé, L1 détails), embeddings 1536 dim
7. Insert dans `rag.documents` avec `source_meeting_id`
8. Update meeting : `extraction_status = 'done'`

**Stratégie de vectorisation :**
- **L0** : 1 chunk résumé par topic (context, type, category)
- **L1** : 1 chunk par segment détaillé, `parent_id` → L0
- Embeddings : OpenAI text-embedding-3-small (1536 dim)
- Metadata QQOQCCP enrichie

### `generate-document` (Edge Function)

**Flux :**
1. Auth : verify JWT, récupère user + org_id
2. Collecte : meetings, items, CCTP chunks (filtré par lot si fiche_lot)
3. Build prompt : template ARPET + données injectées
4. Appel LLM : GPT-4o structured output
5. Génère Markdown → upload dans Storage (`user-workspace`)
6. Insert dans `sources.files` (catégorie `'documents_generes'`, ingestion_level: `'none'`)
7. Retourne `{ file_id, file_name, download_url, doc_type }`

**Types de documents :**
- **Mémo chantier** : synthèse globale — avancement, risques, décisions clés, actions ouvertes
- **Fiche Lot** : prescriptions CCTP + décisions réunions + actions + risques + timeline pour un lot spécifique

---

## 9. Flux utilisateur complets

### Flux 1 : Enregistrement live

```
1. Sidebar → clic "Enregistrer"
2. MeetingRecordModal → mode-select → "Enregistrer"
3. MeetingStep1Prepare → saisie titre (auto-généré)
4. MeetingStep2Record → enregistrement micro (5s min)
5. Stop → processAudio() :
   a. Upload audio → Storage (project-recordings)
   b. Appel meeting-transcribe (Gladia) → transcribed
   c. Appel meeting-extract (GPT-4o) → items + CR + vectorize → done
6. MeetingStep3Review → 4 onglets :
   a. Résumé + copie CR
   b. SpeakerMapping → mapping speakers → intervenants
   c. Décisions & Actions → items groupés
   d. Transcript colorisé
7. Fermeture modal → meeting visible dans /app/reunions
```

### Flux 2 : Import audio

```
1. MeetingRecordModal → mode-select → "Importer un fichier"
2. MeetingUpload → drag & drop ou file picker
3. Validation format + taille (500MB max)
4. MeetingStep1Prepare → titre + options
5. processAudio() (même pipeline que recording)
6. MeetingStep3Review → résultats
```

### Flux 3 : Mémo vocal (depuis ChatInput)

```
1. ChatInput → clic icône micro
2. MemoModal → MemoRecorder
3. Enregistrement 3s min → stop
4. processAudio() avec source_type='memo'
   (pas de diarisation, extraction légère)
5. Success → retour au chat
6. Mémo visible dans /app/reunions
```

### Flux 4 : Consultation historique

```
1. Sidebar → clic "Reunions" → /app/reunions
2. ReunionsPage → onglet "Historique"
3. MeetingHistoryTab :
   - Filtres par source_type
   - Expansion accordion → résumé + participants
4. Onglet "Actions & Décisions"
5. MeetingItemsTab :
   - Stats cliquables (filtres rapides)
   - Filtres : type, statut, lot, responsable, recherche
   - Changement statut inline (optimiste)
   - Détection retards (rouge)
```

### Flux 5 : Génération document

```
1. Page Documents → GenerateDocZone
2. Choix : Mémo chantier ou Fiche Lot
3. Si Fiche Lot → sélection lot (dropdown intervenants)
4. Clic "Générer" → appel EF generate-document
5. Réception file_id → fetch détails fichier
6. Auto-ouverture viewer → MarkdownViewer (preview)
7. Téléchargement → convertMarkdownToPdf() → PDF A4
```

### Flux 6 : Interrogation RAG

```
1. Chat → question sur une réunion
2. baikal-retrieval → search rag.documents
   (source_meeting_id = meeting vectorisé)
3. Chunks L0/L1 retournés avec metadata meeting
4. Réponse sourcée avec citations vers le transcript
```

---

## 10. Audit sécurité & recommandations

### Problèmes identifiés

#### P1 — Critique

| # | Problème | Impact | Recommandation |
|---|---|---|---|
| 1 | **Bucket `project-recordings` est PUBLIC** | Les enregistrements audio sont accessibles sans authentification si le chemin est connu | Passer le bucket en privé, utiliser uniquement des signed URLs |
| 2 | **Policies RLS dupliquées sur `arpet.meetings`** (legacy + V2) | PostgreSQL applique un OR entre toutes les policies → les policies legacy (plus permissives) neutralisent les V2 (plus granulaires) | Supprimer les policies legacy une fois les V2 validées |

#### P2 — Important

| # | Problème | Impact | Recommandation |
|---|---|---|---|
| 3 | **Pas de policy UPDATE sur `core.projet_intervenants`** | Impossible de modifier lot_reference ou role_in_project sans delete/re-insert | Ajouter une policy UPDATE scoped par org |
| 4 | **Pas de policy service role sur `core.intervenants`** | Les Edge Functions utilisant le service role pourraient être bloquées | Ajouter une policy ALL pour le service role |
| 5 | **Policies dev sur Storage** (`Dev Allow All`) | Accès large non restreint en production | Supprimer les policies dev avant mise en production |
| 6 | **`meeting_items` RLS en pattern legacy uniquement** | Non aligné avec les policies V2 des meetings | Migrer vers les fonctions `core.rls_*` |

#### P3 — Améliorations

| # | Problème | Impact | Recommandation |
|---|---|---|---|
| 7 | Types legacy encore exportés (`MeetingActionItem`, `MeetingCR`, `ProcessAudioResponse`) | Dette technique, confusion possible | Marquer deprecated + plan de suppression |
| 8 | `MarkdownViewer` utilise `dangerouslySetInnerHTML` | Risque XSS si le Markdown contient du HTML malicieux | Le parser escapes les entities HTML, mais une lib comme `marked` + `DOMPurify` serait plus robuste |
| 9 | Pas d'index sur `meeting_items.meeting_id` explicite | Performances dégradées sur les JOINs avec volume | Vérifier si un index FK existe, sinon en créer un |

### Points positifs

| Aspect | Détail |
|---|---|
| **Multi-tenant** | org_id systématiquement vérifié dans les RLS et les services |
| **Error handling** | Pattern `{ data, error }` cohérent dans tous les services |
| **DEV logging** | `import.meta.env.DEV` guard sur tous les console.log |
| **Optimistic updates** | MeetingItemsTab update le statut côté client avant persistance |
| **Validation inputs** | Durée minimum (3s memo, 5s record), taille fichier (500MB), formats audio |
| **Séparation concerns** | 4 services distincts, types dans des fichiers dédiés |
| **Barrel exports** | `index.ts` pour composants et types |

---

## 11. Inventaire des fichiers

### Fichiers créés pour le module Meeting V3

| # | Fichier | Phase | Description |
|---|---|---|---|
| 1 | `src/types/meeting.types.ts` | 1 | Types, constantes, helpers meeting |
| 2 | `src/types/intervenant.types.ts` | 4 | Types intervenants |
| 3 | `src/types/meeting-document.types.ts` | 7 | Types documents générés |
| 4 | `src/services/meeting.service.ts` | 1 | Service principal (v4.0.0) |
| 5 | `src/services/meeting-items.service.ts` | 6 | Service cross-meetings items |
| 6 | `src/services/meeting-documents.service.ts` | 7 | Service génération documents |
| 7 | `src/services/intervenants.service.ts` | 4 | CRUD intervenants |
| 8 | `src/components/meeting/index.ts` | 1 | Barrel exports |
| 9 | `src/components/meeting/MeetingRecordModal.tsx` | 2 | Modal principal (refonte v4) |
| 10 | `src/components/meeting/MeetingStep1Prepare.tsx` | 2 | Étape préparation |
| 11 | `src/components/meeting/MeetingStep2Record.tsx` | 2 | Enregistrement live |
| 12 | `src/components/meeting/MeetingStep3Review.tsx` | 4 | Review + mapping (refonte v4) |
| 13 | `src/components/meeting/MeetingProgressIndicator.tsx` | 2 | Indicateur progression |
| 14 | `src/components/meeting/MeetingUpload.tsx` | 2 | Import audio drag & drop |
| 15 | `src/components/meeting/MemoRecorder.tsx` | 2 | Enregistrement mémo |
| 16 | `src/components/meeting/MemoModal.tsx` | 2 | Modale mémo standalone |
| 17 | `src/components/meeting/SpeakerMapping.tsx` | 4 | Mapping speakers |
| 18 | `src/components/meeting/ReunionsPage.tsx` | 6 | Page /app/reunions |
| 19 | `src/components/meeting/MeetingHistoryTab.tsx` | 6 | Onglet historique |
| 20 | `src/components/meeting/MeetingItemsTab.tsx` | 6 | Onglet dashboard items |
| 21 | `src/components/documents/GenerateDocZone.tsx` | 7 | UI génération docs |
| 22 | `src/components/viewer/MarkdownViewer.tsx` | 7 | Viewer Markdown |
| 23 | `src/utils/markdown-to-pdf.ts` | 7 | Conversion MD → PDF |
| 24 | `src/pages/Reunions.tsx` | 6 | Page wrapper route |

### Fichiers modifiés

| # | Fichier | Phase | Modification |
|---|---|---|---|
| 1 | `src/App.tsx` | 6 | Route `/app/reunions` |
| 2 | `src/components/layout/sidebar/SidebarNavigation.tsx` | 6 | NavItem Reunions + bouton Enregistrer |
| 3 | `src/components/chat/ChatInput.tsx` | 2 | Bouton mémo + MemoModal |
| 4 | `src/components/viewer/SplitViewPanel.tsx` | 7 | Support type `'markdown'` |
| 5 | `src/types/viewer.types.ts` | 7 | Détection fichiers .md |
| 6 | `src/components/viewer/index.ts` | 7 | Export MarkdownViewer |
| 7 | `src/components/documents/DocumentRow.tsx` | 7 | Téléchargement .md → PDF |
| 8 | `src/services/documents/document-queries.service.ts` | 7 | Param `forceDownload` optionnel |
| 9 | `src/types/index.ts` | 1-7 | Re-exports centralisés |
| 10 | `src/stores/appStore.ts` | — | Utilisé par le module (viewer, activeProject) |
| 11 | `src/hooks/useAuth.ts` | — | Utilisé par le module (profile.org_id) |

### Edge Functions (repo Frontend-Baikal)

| # | Edge Function | Fichiers | Phase |
|---|---|---|---|
| 1 | `meeting-transcribe` | `index.ts`, `gladia.ts`, `storage.ts`, `types.ts` | 3 |
| 2 | `meeting-extract` | `index.ts`, `extraction.ts`, `template.ts`, `vectorize.ts`, `types.ts` | 3 |
| 3 | `generate-document` | Fichier unique | 7 |

### Migrations Supabase

| # | Migration | Phase |
|---|---|---|
| 1 | `meeting_v3_enrich_source_type` | 1 |
| 2 | `meeting_v3_add_meeting_items_columns` | 1 |
| 3 | `meeting_v3_enrich_extraction_status` | 1 |
| 4 | `meeting_v3_add_documents_generes_category` | 1 |
| 5 | `storage_user_workspace_project_read_policy` | 7 |

### Dépendances ajoutées

| Package | Version | Usage |
|---|---|---|
| `html2pdf.js` | — | Conversion Markdown → PDF côté client (~1MB bundle) |

---

**Total : 24 fichiers créés, 11 fichiers modifiés, 3 Edge Functions, 5 migrations, 1 dépendance.**
