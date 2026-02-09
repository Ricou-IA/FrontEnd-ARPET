# SPEC_MEETING_V3.md — Module Réunion ARPET

> Cahier des charges complet — Rédigé le 2026-02-05
> Statut : 📋 Spécifié — En attente de développement

---

## 1. Vision & Objectifs

### 1.1 Vision produit
Le module Réunion transforme chaque échange de chantier (réunion, visio, mémo vocal) en **intelligence requêtable**. L'objectif est de faire du RAG ARPET une **mémoire vivante du chantier** en croisant les informations issues des réunions (documents chauds) avec les documents contractuels et normatifs (documents froids).

### 1.2 Objectifs clés
1. **Capturer** — Enregistrer facilement les réunions (présentiel, visio, mémo vocal)
2. **Transcrire** — Obtenir un transcript de qualité en français avec identification des locuteurs
3. **Extraire** — Produire un CR structuré (décisions, actions, alertes) conforme au template entreprise
4. **Ingérer** — Rendre le contenu des réunions requêtable dans le RAG
5. **Croiser** — Permettre le croisement chaud/froid (transcript ↔ CCTP/DTU/normes)
6. **Synthétiser** — Générer des documents de métadonnées à la demande (mémo chantier, fiche lot)

### 1.3 Utilisateurs cibles
- Conducteurs de travaux (usage principal)
- Chefs de chantier (enregistrement terrain)
- Équipes projet (consultation CR, suivi actions)

---

## 2. Architecture Globale

### 2.1 Schéma d'ensemble

```
┌─────────────── CAPTURE ──────────────────────────────────┐
│                                                           │
│  🎙️ Présentiel          💻 Visio          🗣️ Mémo        │
│  MediaRecorder          Recall.ai         Record          │
│  + Upload fichier       Bot calendrier    simplifié       │
│                                                           │
│         └──────────┬─────────┘              │             │
│                    ▼                        ▼             │
│             ┌──────────────┐      ┌──────────────┐       │
│             │   Gladia     │      │   Gladia     │       │
│             │ + diarisation│      │ sans diariz. │       │
│             └──────┬───────┘      └──────┬───────┘       │
│                    ▼                     ▼                │
│         ┌──────────────────────────────────────┐         │
│         │     EXTRACTION STRUCTURÉE (LLM)      │         │
│         │  Résumé + Items + QQOQCCP + CR       │         │
│         └──────────────────┬───────────────────┘         │
│                            ▼                              │
│         ┌──────────────────────────────────────┐         │
│         │     INGESTION RAG (chunks par topic)  │         │
│         │  Embedding + QQOQCCP + metadata       │         │
│         └──────────────────┬───────────────────┘         │
│                            ▼                              │
│         ┌──────────────────────────────────────┐         │
│         │     REQUÊTABILITÉ + DOCUMENTS GÉNÉRÉS │         │
│         │  Timeline, Cross-ref, Mémo chantier   │         │
│         └──────────────────────────────────────┘         │
└───────────────────────────────────────────────────────────┘
```

### 2.2 APIs externes

| Service | Rôle | Coût | Config |
|---------|------|------|--------|
| **Gladia** | Transcription FR + diarisation | $0.61/h | Secret `GLADIA_API_KEY` (existe) |
| **Recall.ai** | Bot visio Teams/Meet/Zoom + sync calendrier | $0.50/h bot + audio | Secret `RECALL_API_KEY` (existe) |
| **GPT-4o** (ou meilleur adapté) | Extraction structurée JSON | Variable | Configurable |
| **OpenAI Embeddings** | Vectorisation chunks | Pipeline existant | Déjà configuré |

---

## 3. Bloc 1 — CAPTURE

### 3.1 Trois modes de capture

#### Mode Présentiel (enregistrement local + upload)
- **MediaRecorder** : enregistrement direct via le navigateur (existe déjà)
- **Upload fichier** : l'utilisateur importe un fichier audio (mp3, m4a, wav, webm, ogg)
- Layer : `project` (`shared_with_team = true`)
- `source_type` : `recording` (micro) ou `uploaded_audio` (import)

#### Mode Visio (Recall.ai bot)
- **Sync calendrier** : scan Google Calendar / Outlook via Recall.ai
- Table `arpet.calendar_events_scan` déjà prête
- L'utilisateur voit ses réunions à venir et active le bot sur celles qu'il veut capturer
- Le bot rejoint la visio, capture l'audio, envoie via webhook
- Layer : `project` (`shared_with_team = true`)
- `source_type` : `visio_bot`

#### Mode Mémo vocal
- UX simplifiée : pas de formulaire lourd, bouton "Mémo" → enregistrer → terminé
- Durée typique : 30s à 5min
- 1 seul locuteur → pas de diarisation
- Layer : `user` (`shared_with_team = false`)
- `source_type` : `memo`
- `project_id` obligatoire (contexte chantier requis)
- Promotable vers layer `project` via le workflow standard `sources.files`

### 3.2 Source types enrichis

Valeurs actuelles DB : `recording | uploaded_cr | manual`

**Nouvelles valeurs** : `recording | uploaded_audio | visio_bot | memo | uploaded_cr | manual`

→ Nécessite migration : ALTER CHECK constraint sur `arpet.meetings.source_type`

### 3.3 Layer & Promotion

| Type | Layer initial | `shared_with_team` | Promotable |
|------|--------------|-------------------|------------|
| Réunion présentiel | `project` | `true` | — |
| Réunion visio | `project` | `true` | — |
| Mémo vocal | `user` | `false` | ✅ → `project` |

**Mécanisme de promotion** (générique, pas spécifique meeting) :
- Existe déjà dans `sources.files` : `promotion_status` (draft → pending → approved/rejected)
- Colonnes : `promotion_requested_by`, `promotion_requested_at`, `promotion_reviewed_by`, `promotion_reviewed_at`, `promotion_comment`
- Workflow : User soumet → Team Leader valide → `layer` passe de `user` à `project`
- Enum `rag.document_status` : `draft | pending | approved | rejected`

---

## 4. Bloc 2 — TRANSCRIPTION + DIARISATION

### 4.1 Configuration Gladia

| Paramètre | Valeur réunion | Valeur mémo |
|-----------|---------------|-------------|
| Mode | **Async** (pre-recorded) | **Async** |
| Langue | `fr` (forcé) | `fr` |
| Diarisation | **Activée** | **Désactivée** |
| Speakers min/max | 2 / 10 | — |
| Custom vocabulary | ✅ Termes projet | ✅ Termes projet |
| Summarization Gladia | **Non** (on fait notre propre extraction) | **Non** |

### 4.2 Custom vocabulary dynamique

Alimenté depuis les données du projet :
- Noms des bâtiments/résidences (depuis chunks RAG, metadata)
- Noms des lots (depuis `core.projet_intervenants`)
- Noms des intervenants (depuis `core.intervenants`)
- Termes techniques du CCTP (depuis chunks RAG, `concepts`)

→ Edge Function construit le vocabulaire avant d'appeler Gladia

### 4.3 Mapping des locuteurs

**MVP — Niveau 1 : Mapping manuel assisté**
- Gladia retourne `Speaker 0`, `Speaker 1`, etc.
- UI affiche un extrait de chaque speaker + liste déroulante
- Liste déroulante alimentée par : participants renseignés + `core.intervenants` du projet
- L'utilisateur mappe manuellement

**V2 — Niveau 2 : Propositions par historique**
- Croisement avec les meetings précédentes du même projet
- Proposition de pré-mapping basée sur la fréquence de participation
- Human in the loop : l'utilisateur valide/corrige

**V3 — Niveau 3 : Matching par contenu**
- Analyse sémantique du contenu par speaker
- Croisement avec `core.projet_intervenants` (lot rattaché)
- Ex : Speaker parle du "lot peinture" → proposition "Pierre Martin (Lot Peinture)"
- Recherche RAG pour enrichir la confiance du matching

### 4.4 Structure participants enrichie

Dans `meetings.participants` (jsonb) :
```json
[
  {
    "speaker_id": 0,
    "name": "Pierre Martin",
    "role": "Responsable Lot Peinture",
    "company": "SARL Martin",
    "intervenant_id": "uuid-ref-core-intervenants",
    "confidence": "confirmed",
    "matched_by": "user"
  },
  {
    "speaker_id": 1,
    "name": "Speaker 1",
    "confidence": "unmatched",
    "matched_by": null
  }
]
```

Champs `matched_by` : `user` (MVP), `history` (V2), `content` (V3)

### 4.5 Stockage transcript

| Donnée | Stockage | Format |
|--------|----------|--------|
| Transcript brut Gladia (segments + timestamps + speakers) | Supabase Storage `meeting-transcripts/{org_id}/{meeting_id}.json` | JSON complet |
| Transcript texte lisible | Supabase Storage `.txt` + `meetings.transcript_path` | Texte avec `[Speaker X]` markers |

### 4.6 Flux technique

```
Audio (blob/fichier/webhook Recall)
    │
    ├─→ Upload Supabase Storage (bucket: project-recordings)
    │
    ├─→ Edge Function "meeting-transcribe"
    │   │
    │   ├─→ Construction custom vocabulary (données projet)
    │   ├─→ Envoi Gladia API (async, pre-recorded)
    │   │   • audio_url: signed URL du Storage
    │   │   • language: 'fr'
    │   │   • diarization: true/false
    │   │   • custom_vocabulary: [...]
    │   │
    │   ├─→ Polling résultat (ou webhook Gladia)
    │   │
    │   ├─→ Stockage transcript (JSON + TXT)
    │   │
    │   └─→ Mise à jour meetings (extraction_status: 'transcribed')
    │
    └─→ Passage à l'extraction (Bloc 3)
```

---

## 5. Bloc 3 — EXTRACTION STRUCTURÉE

### 5.1 Couches d'extraction

#### Couche 1 — Résumé
- Résumé exécutif (3-5 phrases)
- Points clés abordés
- Nombre de décisions/actions/alertes

#### Couche 2 — Items structurés
| Type | Description | Icône |
|------|-------------|-------|
| `decision` | Choix validés, arbitrages | ✅ |
| `action` | Tâches assignées avec responsable et échéance | 📋 |
| `issue` | Alertes, risques, points de vigilance | ⚠️ |
| `info` | Informations factuelles, rappels | ℹ️ |

Chaque item contient :
- `subject` : titre court
- `content` : description détaillée
- `context` : contexte de la discussion (optionnel)
- `lot_reference` : lot concerné
- `responsible` : personne/entreprise responsable
- `due_date` : échéance (si applicable)
- `status` : open (default)
- `location` : bâtiment/zone concernée
- `topic_tags` : thèmes (acoustique, étanchéité, planning...)
- `related_documents` : références citées ("cf. CCTP page 34", "DTU 25.41")

#### Couche 3 — Enrichissement QQOQCCP
Même framework que les documents classiques :
- **Qui** : lots, intervenants
- **Quoi** : ouvrages, matériaux
- **Où** : localisations, bâtiments, zones
- **Quand** : dates, phases
- **Comment** : normes, DTU référencés
- **Combien** : mesures, quantités, montants
- **Pourquoi** : justifications, motifs

#### Couche 4 — Relations inter-réunions (V2)
- Différé post-MVP
- Préparé via `topic_tags` + `lot_reference` qui permettent le matching inter-réunions

### 5.2 Mémo vocal — Extraction allégée
Pour les mémos (<5min, 1 locuteur) :
- Sujet détecté
- Mots-clés / tags
- Actions éventuelles (si détectées)
- Rattachement lot/localisation (si détectable)
- Pas de CR formel

### 5.3 Compte-rendu formaté

#### Template entreprise (MVP)
- Le système cherche un modèle dans `sources.files` : `layer = 'org'`, `category = 'modeles'`, type CR réunion
- **Si trouvé** : génère le CR en respectant la structure du template
- **Si pas trouvé** : utilise le template ARPET par défaut

#### Catégories DB existantes
- `modeles` (slug) — "Templates et documents réutilisables" — layers: `org`, `project` ✅
- `transcripts` (slug) — "Comptes-rendus audio" — layers: `project` ✅
- `echanges_cr` (slug) — "Courriers, Mails, Comptes-rendus" — layers: `project` ✅

### 5.4 Modèle LLM
- **GPT-4o** recommandé pour l'extraction JSON structurée (meilleur ratio qualité/coût pour le structured output)
- Configurable : champ `meetings.model_used` enregistre le modèle utilisé
- Le choix final sera validé lors des tests

### 5.5 Flux technique

```
Transcript Gladia (texte + speakers + timestamps)
    │
    ▼
Edge Function "meeting-extract"
    │
    ├─→ Lookup template CR
    │   Query: sources.files WHERE layer='org' AND category='modeles'
    │   Fallback: template ARPET par défaut
    │
    ├─→ Prompt d'extraction structurée (LLM)
    │   Input: transcript + participants + agenda + template
    │   Output JSON:
    │   {
    │     summary: string,
    │     key_points: string[],
    │     items: [{
    │       type: 'decision'|'action'|'issue'|'info',
    │       subject: string,
    │       content: string,
    │       context?: string,
    │       lot_reference?: string,
    │       responsible?: string,
    │       due_date?: string,
    │       location?: string,
    │       topic_tags: string[],
    │       related_documents?: string[]
    │     }],
    │     formatted_report: string,
    │     next_meeting?: { date?: string, agenda_items?: string[] },
    │     qqoqccp: { ... }
    │   }
    │
    ├─→ Persistance DB
    │   → meetings: summary, formatted_report, next_meeting_date, extraction_status='done'
    │   → meeting_items: 1 row par item extrait
    │
    └─→ Passage à l'ingestion RAG (Bloc 4)
```

---

## 6. Bloc 4 — INGESTION RAG

### 6.1 Principe fondamental
- **On ingère le transcript** (chunké par topic) → requêtable
- **On n'ingère PAS le CR** → pas de bruit dans l'index
- Le CR est stocké en **metadata** de chaque chunk → sert de source affichable quand le RAG trouve un résultat

### 6.2 Chunking sémantique par topic

```
Transcript d'une réunion d'1h (~8000-12000 mots)
    │
    ▼
Chunking par blocs thématiques
    │
    ├─→ 1 chunk L0 (résumé global de la réunion)
    │   hierarchy_level: 0
    │
    └─→ N chunks L1 (1 par sujet/topic abordé)
        hierarchy_level: 1
        parent_chunk_id: → id du L0
```

### 6.3 Structure chunk L0 (résumé)

```
rag.documents:
  content: "Réunion de chantier Résidence Dunant du 05/02/2026.
            7 participants. Sujets abordés : avancement lot plomberie,
            choix coloris bâtiment B, planning général..."
  metadata: {
    source_type: "meeting_transcript",
    meeting_id: "uuid",
    meeting_date: "2026-02-05",
    meeting_title: "Réunion de chantier #12",
    participants: ["Dupont", "Durand", "Martin"],
    lots_discussed: ["plomberie", "peinture", "gros_oeuvre"],
    decisions_count: 3,
    actions_count: 5,
    formatted_report: "# Compte-rendu complet...",
    category_slug: "transcripts"
  }
  source_meeting_id: uuid → arpet.meetings.id
  layer: 'project' (ou 'user' pour mémo)
  hierarchy_level: 0
  qui_lots: ['plomberie', 'peinture', 'gros_oeuvre']
  quand_date: 2026-02-05
```

### 6.4 Structure chunk L1 (topic)

```
rag.documents:
  content: "[Dupont] : Sur le lot plomberie, on a 2 semaines de retard
            sur la tuyauterie du bâtiment B...
            [Durand] : Je fournis le planning recalé avant le 15.
            → ACTION: Durand fournit planning lot plomberie avant le 15/02
            → ISSUE: Retard 2 semaines, impact livraison possible"
  metadata: {
    source_type: "meeting_transcript",
    meeting_id: "uuid",
    meeting_date: "2026-02-05",
    topic: "Retard lot plomberie — tuyauterie bâtiment B",
    formatted_report: "# Compte-rendu complet...",
    category_slug: "transcripts"
  }
  source_meeting_id: uuid
  layer: 'project'
  hierarchy_level: 1
  parent_chunk_id: <id_du_L0>
  qui_lots: ['plomberie']
  quand_date: 2026-02-05
  qqoqccp: {
    qui: { lots: ["plomberie"], intervenants: ["Durand"] },
    quoi: { ouvrages: ["tuyauterie"] },
    ou: { localisation: ["bâtiment B"] },
    quand: { date: "2026-02-15", phase: "execution" },
    comment: { normes: [] },
    combien: {},
    pourquoi: {}
  }
```

### 6.5 Pipeline d'ingestion

**Pipeline dédié** (Edge Function, pas n8n) — plus rapide, le Bloc 3 fournit déjà les topics et métadonnées.

```
Extraction terminée (Bloc 3)
    │
    ▼
Edge Function "meeting-ingest" (ou intégré dans meeting-extract)
    │
    ├─→ Création source_file dans sources.files
    │   • layer: 'project' ou 'user'
    │   • category: 'transcripts'
    │   • project_id, org_id, created_by
    │
    ├─→ Construction des chunks à partir de l'extraction
    │   • L0: résumé meeting
    │   • L1: 1 par topic (regroupement des items par sujet)
    │   • Enrichissement QQOQCCP intégré (données déjà extraites)
    │
    ├─→ Embedding OpenAI (1536 dim, pipeline existant)
    │
    ├─→ Insert rag.documents (avec source_meeting_id)
    │
    ├─→ Mise à jour meetings.source_file_id
    │
    └─→ extraction_status = 'done'
```

### 6.6 Hot document (optionnel, désactivé par défaut)

Le mécanisme `is_hot_document` + `hot_until` est **prévu dans les metadata** mais **désactivé par défaut**. À activer si les tests montrent un besoin de pondération temporelle.

---

## 7. Bloc 5 — REQUÊTABILITÉ AVANCÉE

### 7.1 Cas d'usage MVP

| Catégorie | Exemple | Mécanisme | Fiabilité |
|-----------|---------|-----------|-----------|
| **Factuelle** | "Qu'est-ce qui a été décidé pour le lot plomberie ?" | RAG classique (`match_documents_v14`) | ✅ Haute |
| **Timeline textuelle** | "Historique du retard CVC depuis janvier" | RAG multi-réunions, tri par `meeting_date` | ✅ Haute |
| **Cross-ref chaud/froid** | "Le CCTP prescrit du grès cérame, qu'est-ce qui a été validé en réunion ?" | Dual-scope search (project + app layer) | ✅ Haute |
| **Suivi actions (vue)** | "Quelles actions sont ouvertes ?" | SQL direct sur `meeting_items` | ✅ Haute |
| **Suivi actions (chat)** | "Où en sont les actions de Durand ?" | RAG (best effort) | ⚠️ Moyen |

### 7.2 Vue structurée actions/décisions (Dashboard)

Requêtes SQL directes sur `meeting_items` (pas d'IA, fiable à 100%) :
- Filtres : lot, responsable, statut, échéance, type
- Tri : par date, par lot, par responsable
- Alertes : actions en retard (due_date < now() AND status = 'open')

### 7.3 Cas d'usage V2

| Feature | Description |
|---------|-------------|
| Timeline visuelle | Composant frise chronologique |
| Détection de question temporelle | Le RAG détecte automatiquement une question type "historique" et active le mode timeline |

### 7.4 Ce qui rend le croisement possible

L'enrichissement QQOQCCP identique entre documents froids (CCTP) et chauds (transcripts) permet :
- Match sur `qui_lots` → même nomenclature de lots
- Match sur `comment_normes` → mêmes références DTU/NF
- Match sur `qqoqccp.quoi.ouvrages` → mêmes termes d'ouvrages
- Le `match_documents_v14` avec dual-scope cherche dans les 2 layers simultanément

---

## 8. Bloc 6 — DOCUMENTS DE MÉTADONNÉES

### 8.1 Vision
Zone UI dédiée permettant de générer à la demande des documents de synthèse à partir du corpus du chantier. Documents logotés ARPET, non paramétrable (template app standard).

### 8.2 Documents MVP

#### Mémo de chantier
- **Input** : dernières réunions (transcripts + meeting_items) + infos projet
- **Output** : synthèse globale — avancement, risques, décisions clés, actions ouvertes
- **Déclenchement** : bouton "Générer" dans la zone UI dédiée

#### Fiche lot
- **Input** : CCTP (ce qui est prévu) + transcripts (ce qui a été décidé) + meeting_items (actions ouvertes) filtrés par lot
- **Output** : synthèse par lot — prescriptions contractuelles, décisions prises, actions en cours, points de vigilance
- **Déclenchement** : sélection du lot + bouton "Générer"

### 8.3 Documents V2

| Document | Description |
|----------|-------------|
| Fiche intervenant | Historique d'un intervenant : engagements, actions, retards |
| Rapport de suivi | Tableau croisé actions/décisions par lot et par date |
| Brief nouveau arrivant | Résumé complet du chantier pour un nouvel arrivant |
| Alerte risques | Points de vigilance et récurrences détectées |

### 8.4 Caractéristiques

| Aspect | Décision |
|--------|----------|
| Déclenchement | À la demande uniquement (pas de cron) |
| Template | ARPET standard (layer app), non paramétrable |
| Branding | Logotés avec infos entreprise (nom, logo depuis `core.organizations`) |
| Format | Affichage dans l'app + export PDF |
| Stockage | `sources.files`, layer `project`, catégorie `documents_generes` |
| Ingestion RAG | **Non** — GED pure, consultation/téléchargement uniquement |

### 8.5 Nouvelle catégorie DB à créer

```sql
INSERT INTO config.document_categories (slug, label, description, target_apps, target_layers, sort_order)
VALUES ('documents_generes', 'Documents Générés', 'Synthèses et rapports générés par ARPET',
        ARRAY['arpet'], ARRAY['project']::rag.document_layer[], 75);
```

### 8.6 Zone UI

```
┌─────────────────────────────────────────────────┐
│  📄 Documents du chantier                        │
│                                                   │
│  ┌───────────────────┐  ┌───────────────────┐    │
│  │ 📋 Mémo de        │  │ 🏗️ Fiche Lot      │    │
│  │    chantier        │  │                   │    │
│  │                    │  │ Sélectionner :    │    │
│  │ Synthèse globale   │  │ [Plomberie    ▼]  │    │
│  │ avancement,        │  │                   │    │
│  │ risques, actions   │  │ Prévu (CCTP) +    │    │
│  │                    │  │ Décidé (réunions) │    │
│  │  [ Générer ]       │  │ + Actions ouvertes│    │
│  └───────────────────┘  │                   │    │
│                          │  [ Générer ]      │    │
│                          └───────────────────┘    │
│                                                   │
│  📁 Documents déjà générés                        │
│  ├ Mémo chantier — 03/02/2026           📥 PDF   │
│  ├ Fiche Lot Plomberie — 01/02          📥 PDF   │
│  └ Mémo chantier — 27/01/2026           📥 PDF   │
└─────────────────────────────────────────────────┘
```

### 8.7 Flux de génération

```
User clique "Générer Mémo de chantier"
    │
    ▼
Edge Function "meeting-generate-doc"
    │
    ├─→ Collecte des données projet :
    │   • meeting_items récents (actions ouvertes, décisions)
    │   • Chunks transcripts (3-4 dernières réunions)
    │   • Infos projet (core.projects)
    │   • Intervenants (core.projet_intervenants)
    │   • Infos entreprise (core.organizations) pour le branding
    │
    ├─→ LLM génère le document (template ARPET standard)
    │
    ├─→ Génération PDF (logotage entreprise)
    │
    ├─→ Stockage :
    │   • PDF → Supabase Storage
    │   • Entrée → sources.files (layer: project, category: documents_generes)
    │
    └─→ Retour UI : aperçu + téléchargement
```

---

## 9. Modifications DB Requises

### 9.1 Migrations

| Migration | Description | Priorité |
|-----------|-------------|----------|
| Enrichir CHECK `source_type` sur `arpet.meetings` | Ajouter `uploaded_audio`, `visio_bot`, `memo` | Bloc 1 |
| Ajouter colonnes `meeting_items` | `location`, `topic_tags` (text[]), `related_documents` (text[]) | Bloc 3 |
| Créer catégorie `documents_generes` | Insert dans `config.document_categories` | Bloc 6 |

### 9.2 Colonnes existantes déjà prêtes

| Table | Colonne | Usage |
|-------|---------|-------|
| `arpet.meetings.source_file_id` | FK vers `sources.files` (promotion, layer) | Bloc 1 |
| `arpet.meetings.shared_with_team` | Layer indicator (true=project, false=user) | Bloc 1 |
| `arpet.meetings.transcript_path` | Chemin transcript dans Storage | Bloc 2 |
| `arpet.meetings.formatted_report` | CR structuré | Bloc 3 |
| `arpet.meetings.extraction_status` | Workflow (pending → processing → done → error) | Blocs 2-4 |
| `arpet.meetings.model_used` | Modèle LLM utilisé | Bloc 3 |
| `rag.documents.source_meeting_id` | FK vers meetings | Bloc 4 |
| `rag.documents.layer` | enum user/project/org/app | Bloc 4 |
| `rag.documents.qqoqccp` | Enrichissement structuré | Bloc 4 |
| `sources.files.promotion_*` | Workflow promotion user → project | Bloc 1 |

---

## 10. Edge Functions à Créer

| Edge Function | Rôle | Blocs | Repo |
|---------------|------|-------|------|
| `meeting-transcribe` | Upload audio → Gladia → transcript | 1, 2 | Frontend-Baikal |
| `meeting-extract` | Transcript → extraction LLM → items + CR | 3 | Frontend-Baikal |
| `meeting-ingest` | Chunks → embedding → rag.documents | 4 | Frontend-Baikal |
| `meeting-generate-doc` | Collecte données → LLM → PDF | 6 | Frontend-Baikal |

> Note : `meeting-transcribe`, `meeting-extract` et `meeting-ingest` peuvent être fusionnées en un pipeline séquentiel si pertinent. À décider à l'implémentation.

---

## 11. Composants Frontend à Créer/Modifier

### 11.1 Nouveaux composants

| Composant | Description | Bloc |
|-----------|-------------|------|
| `MeetingUpload.tsx` | Upload fichier audio (drag & drop + file picker) | 1 |
| `MeetingVisioSchedule.tsx` | Liste réunions calendrier + activation bot Recall | 1 |
| `MemoRecorder.tsx` | Enregistrement simplifié mémo vocal | 1 |
| `SpeakerMapping.tsx` | Interface mapping speakers → intervenants | 2 |
| `MeetingHistory.tsx` | Liste des réunions passées avec filtres | 5 |
| `MeetingItemsDashboard.tsx` | Vue structurée actions/décisions (filtres, alertes) | 5 |
| `GenerateDocZone.tsx` | Zone UI génération documents (mémo chantier, fiche lot) | 6 |

### 11.2 Composants existants à modifier

| Composant | Modification | Bloc |
|-----------|-------------|------|
| `MeetingRecordModal.tsx` | Ajout mode upload + mode mémo | 1 |
| `MeetingStep1Prepare.tsx` | Choix du mode (enregistrer/upload/mémo) | 1 |
| `MeetingStep3Review.tsx` | Intégration SpeakerMapping + champs enrichis | 2, 3 |
| `Dashboard.tsx` | Intégration MeetingHistory + MeetingItemsDashboard | 5 |
| `Sidebar.tsx` | Navigation vers les nouvelles vues | 5, 6 |

### 11.3 Services

| Service | Description | Bloc |
|---------|-------------|------|
| `meeting.service.ts` | Refonte : appels Edge Functions, types enrichis | 1-4 |
| `meeting-items.service.ts` | CRUD meeting_items, requêtes filtrées | 5 |
| `meeting-docs.service.ts` | Appel génération documents + téléchargement PDF | 6 |
| `recall.service.ts` | Intégration Recall.ai (calendrier, bot) | 1 |

---

## 12. Périmètre MVP vs V2

### MVP

| Feature | Bloc |
|---------|------|
| Enregistrement local (MediaRecorder) | 1 |
| Upload fichier audio | 1 |
| Mémo vocal (UX simplifiée) | 1 |
| Transcription Gladia (async, FR, diarisation) | 2 |
| Custom vocabulary dynamique | 2 |
| Mapping speakers manuel | 2 |
| Extraction structurée (résumé + items + QQOQCCP) | 3 |
| CR formaté (template entreprise ou ARPET par défaut) | 3 |
| Ingestion RAG (chunks par topic) | 4 |
| Recherche factuelle dans transcripts | 5 |
| Timeline textuelle | 5 |
| Cross-ref chaud/froid | 5 |
| Vue structurée actions/décisions | 5 |
| Historique réunions | 5 |
| Génération mémo de chantier | 6 |
| Génération fiche lot | 6 |
| Export PDF | 6 |

### V2

| Feature | Bloc |
|---------|------|
| Recall.ai bot visio + sync calendrier | 1 |
| Mapping speakers par historique (niveau 2) | 2 |
| Mapping speakers par contenu/RAG (niveau 3) | 2 |
| Timeline visuelle (composant frise) | 5 |
| Fiche intervenant | 6 |
| Rapport de suivi | 6 |
| Brief nouveau arrivant | 6 |
| Alerte risques | 6 |

---

## 13. Découpage en Blocs de Développement

### Conversation 1 — DB + Types + Services de base
- Migrations DB (source_type, colonnes meeting_items, catégorie documents_generes)
- Types TypeScript enrichis (meeting.types.ts)
- Service meeting.service.ts refactoré
- Build ✅

### Conversation 2 — Capture (Frontend)
- MeetingUpload.tsx (upload fichier)
- MemoRecorder.tsx (mémo vocal simplifié)
- Refonte MeetingRecordModal (3 modes : enregistrer / upload / mémo)
- MeetingStep1Prepare enrichi
- Build ✅

### Conversation 3 — Edge Function Transcription + Extraction
- Edge Function meeting-transcribe (Gladia async)
- Edge Function meeting-extract (LLM structured extraction)
- Custom vocabulary builder
- Tests avec audio réel
- Déploiement Supabase

### Conversation 4 — Speaker Mapping + Review UI
- SpeakerMapping.tsx (interface mapping)
- MeetingStep3Review enrichi (items + métadonnées + mapping)
- Persistance participants enrichis
- Build ✅

### Conversation 5 — Ingestion RAG
- Edge Function meeting-ingest (chunking + embedding)
- Chunking sémantique par topic
- Enrichissement QQOQCCP
- CR en metadata des chunks
- Tests requêtes RAG sur transcripts
- Déploiement Supabase

### Conversation 6 — Historique + Vue Actions
- MeetingHistory.tsx (liste réunions, filtres)
- MeetingItemsDashboard.tsx (vue structurée actions/décisions)
- meeting-items.service.ts (requêtes filtrées)
- Intégration Dashboard + navigation Sidebar
- Build ✅

### Conversation 7 — Documents Générés
- GenerateDocZone.tsx (UI)
- Edge Function meeting-generate-doc
- meeting-docs.service.ts
- Génération PDF (mémo chantier + fiche lot)
- Stockage sources.files
- Build ✅

### Conversation 8 — Tests End-to-End + Stabilisation
- Test complet du flux : enregistrement → transcript → extraction → RAG → requête
- Test cross-ref chaud/froid
- Test génération documents
- Fix bugs, ajustements UX
- Build final ✅ → Push GitHub
