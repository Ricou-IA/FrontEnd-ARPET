# PROMPTS_MEETING_V3.md — Prompts de développement

> Chaque prompt correspond à une conversation Claude Code dédiée.
> Lancer dans l'ordre. Chaque conversation doit finir par un `npm run build` vert.
> Spec complète : `docs/SPEC_MEETING_V3.md`

---

## Conversation 1/8 — DB + Types + Services de base

```
Contexte : Module Meeting V3 pour ARPET. Lis d'abord docs/SPEC_MEETING_V3.md (sections 9 et 11.3).

Objectif de cette conversation : Préparer les fondations DB et TypeScript pour le module Meeting V3.

Tâches :

1. MIGRATIONS DB (via Supabase MCP) :
   a. Enrichir le CHECK constraint sur arpet.meetings.source_type : ajouter 'uploaded_audio', 'visio_bot', 'memo' aux valeurs existantes ('recording', 'uploaded_cr', 'manual')
   b. Ajouter 3 colonnes à arpet.meeting_items :
      - location TEXT nullable
      - topic_tags TEXT[] DEFAULT '{}'
      - related_documents TEXT[] DEFAULT '{}'
   c. Insérer la catégorie 'documents_generes' dans config.document_categories :
      slug='documents_generes', label='Documents Générés', description='Synthèses et rapports générés par ARPET', target_apps=ARRAY['arpet'], target_layers=ARRAY['project']::rag.document_layer[], sort_order=75
   d. Vérifier que les RLS sur meeting_items sont toujours OK après les ajouts

2. TYPES TYPESCRIPT (src/types/meeting.types.ts) :
   - Enrichir MeetingProcessingStatus : ajouter 'transcribed' entre 'transcribing' et 'analyzing'
   - Ajouter type MeetingSourceType = 'recording' | 'uploaded_audio' | 'visio_bot' | 'memo' | 'uploaded_cr' | 'manual'
   - Enrichir MeetingPrepareData : ajouter source_type, project_id, org_id
   - Ajouter type MeetingParticipantEnriched : { speaker_id, name, role?, company?, intervenant_id?, confidence: 'confirmed'|'unmatched'|'suggested', matched_by: 'user'|'history'|'content'|null }
   - Enrichir MeetingItem avec : location?, topic_tags: string[], related_documents?: string[]
   - Ajouter type MemoExtraction : { subject, tags: string[], actions?: string[], lot_reference?, location? }

3. SERVICE meeting.service.ts :
   - Refactorer pour supporter les 3 modes de capture
   - Ajouter fonction uploadAudioFile(file: File, meetingId: string) → upload vers Supabase Storage
   - Ajouter fonction getMeetingHistory(projectId: string) → liste des meetings du projet
   - Ajouter fonction updateMeetingItem(itemId: string, updates: Partial<MeetingItem>) → update item
   - Garder les fonctions existantes (processAudio, groupItemsByType, etc.)

4. Vérifier npm run build ✅

Important :
- Fournir les fichiers complets (pas de snippets partiels)
- Commandes terminal en PowerShell
- Tester que les migrations passent avant de toucher au frontend
```

---

## Conversation 2/8 — Capture Frontend

```
Contexte : Module Meeting V3 pour ARPET. Lis d'abord docs/SPEC_MEETING_V3.md (section 3) et vérifie les types créés dans la conversation 1 (src/types/meeting.types.ts).

Objectif : Refondre le frontend de capture pour supporter les 3 modes (enregistrer, upload fichier, mémo vocal).

Tâches :

1. COMPOSANT MeetingUpload.tsx (nouveau) :
   - Drag & drop zone + file picker
   - Formats acceptés : mp3, m4a, wav, webm, ogg
   - Affichage nom fichier + taille + durée estimée
   - Bouton "Transcrire" pour lancer le processing

2. COMPOSANT MemoRecorder.tsx (nouveau) :
   - UX ultra simplifiée : gros bouton enregistrer, timer, stop
   - Pas de formulaire de préparation (juste un champ "sujet" optionnel)
   - Durée max suggérée : 5min (warning visuel au-delà)
   - Auto-title : "Mémo du JJ/MM/AAAA à HH:MM"

3. REFONTE MeetingRecordModal.tsx :
   - Ajout d'un écran de sélection du mode AVANT l'étape Préparer :
     • 🎙️ Enregistrer (workflow existant)
     • 📁 Importer un fichier audio (→ MeetingUpload)
     • 🗣️ Mémo vocal rapide (→ MemoRecorder)
   - Le mode sélectionné détermine source_type
   - Le mode Mémo n'affiche PAS l'étape Préparer (juste enregistrer → review allégée)

4. MODIFICATION MeetingStep1Prepare.tsx :
   - Accepter les 2 modes : enregistrement classique ET upload
   - Si upload : afficher la zone de drop au lieu du bouton "Commencer l'enregistrement"
   - project_id et org_id passés en props (plus en optionnel)

5. Vérifier npm run build ✅

Contraintes UX :
- Mode clair (stone/amber palette ARPET)
- Responsive mobile-first (usage terrain sur smartphone)
- Icônes : lucide-react
- Pas de librairie UI externe
```

---

## Conversation 3/8 — Edge Functions Transcription + Extraction

```
Contexte : Module Meeting V3 pour ARPET. Lis d'abord docs/SPEC_MEETING_V3.md (sections 4 et 5). Ces Edge Functions vont dans le repo Frontend-Baikal (supabase/functions/).

IMPORTANT : Ces Edge Functions sont dans le repo Baikal, pas ARPET. L'utilisateur les déploie manuellement vers Supabase. Ne PAS déployer via MCP.

Objectif : Créer les Edge Functions de transcription (Gladia) et d'extraction structurée (LLM).

Tâches :

1. EDGE FUNCTION "meeting-transcribe" :
   - Input : { meeting_id, audio_storage_path, org_id, project_id }
   - Étapes :
     a. Récupérer l'audio depuis Supabase Storage (signed URL)
     b. Construire le custom vocabulary depuis les données projet :
        - Noms intervenants (core.intervenants WHERE projet_intervenants.project_id)
        - Noms lots (core.projet_intervenants.role/company)
        - Termes techniques (top concepts depuis rag.documents WHERE project)
     c. Appeler Gladia API (async, pre-recorded) :
        - audio_url: signed URL
        - language: 'fr'
        - diarization: true (sauf si source_type='memo')
        - diarization_config: { min_speakers: 2, max_speakers: 10 }
        - custom_vocabulary: [termes construits]
     d. Polling résultat Gladia (avec backoff)
     e. Stocker transcript JSON dans Storage (meeting-transcripts/{org_id}/{meeting_id}.json)
     f. Stocker transcript texte dans Storage (.txt)
     g. Mettre à jour meetings : transcript_path, extraction_status='transcribed'
   - Output : { success, transcript_text, speakers_count }

2. EDGE FUNCTION "meeting-extract" :
   - Input : { meeting_id }
   - Étapes :
     a. Récupérer le transcript depuis Storage
     b. Récupérer les infos meeting (participants, agenda, title)
     c. Lookup template CR : sources.files WHERE layer='org' AND category_slug='modeles'
        Fallback : template ARPET par défaut (hardcodé)
     d. Appeler LLM (GPT-4o ou meilleur) avec prompt structuré :
        Input : transcript + participants + agenda + template
        Output JSON : { summary, key_points, items[], formatted_report, next_meeting, qqoqccp_per_topic[] }
     e. Persister dans DB :
        - meetings : summary, formatted_report, next_meeting_date, extraction_status='extracted'
        - meeting_items : 1 row par item (avec location, topic_tags, related_documents)
     f. Si source_type='memo' : extraction allégée (sujet, tags, actions éventuelles)
   - Output : { success, items_count, summary }

3. Le prompt d'extraction doit :
   - Extraire les 4 types d'items (decision, action, issue, info)
   - Identifier lot_reference, responsible, due_date pour chaque item
   - Extraire location et topic_tags
   - Détecter les références documentaires (related_documents : "CCTP page 34", "DTU 25.41")
   - Générer le CR selon le template fourni
   - Enrichir QQOQCCP par topic (pour l'ingestion RAG du Bloc 4)

4. Gestion d'erreurs :
   - Timeout Gladia (configurable, default 10min)
   - Erreur LLM → extraction_status='error', extraction_error=message
   - Audio trop court (<5s) → rejet
```

---

## Conversation 4/8 — Speaker Mapping + Review UI

```
Contexte : Module Meeting V3 pour ARPET. Lis d'abord docs/SPEC_MEETING_V3.md (sections 4.3 et 4.4). Vérifie les types dans src/types/meeting.types.ts.

Objectif : Interface de mapping des speakers Gladia vers les intervenants connus + refonte de l'écran Review.

Tâches :

1. COMPOSANT SpeakerMapping.tsx (nouveau) :
   - Affiche la liste des speakers détectés par Gladia (Speaker 0, 1, 2...)
   - Pour chaque speaker : extrait audio/texte représentatif (première phrase)
   - Liste déroulante pour mapper vers :
     a. Participants renseignés à l'étape Préparer
     b. Intervenants du projet (core.intervenants via core.projet_intervenants)
     c. Saisie libre (nouveau nom)
   - Bouton "Confirmer le mapping"
   - Sauvegarde dans meetings.participants (format MeetingParticipantEnriched)

2. SERVICE : ajouter getProjectIntervenants(projectId: string) dans un service adapté
   - Query : core.projet_intervenants JOIN core.intervenants WHERE project_id
   - Retourne : [{ id, name, company, role, lot }]

3. REFONTE MeetingStep3Review.tsx :
   - Intégrer SpeakerMapping comme première section (avant le résumé)
   - Afficher les items enrichis avec les nouveaux champs : location, topic_tags (badges), related_documents (liens)
   - Dans le transcript : remplacer [Speaker 0] par le nom mappé
   - Le CR formaté (formatted_report) dans un onglet dédié avec bouton "Copier"
   - Les topic_tags comme badges filtrables

4. Vérifier npm run build ✅

UX :
- Le mapping est proposé AVANT la review du contenu (le contenu est plus lisible avec les vrais noms)
- Si l'utilisateur skip le mapping, les speakers restent "Speaker 0", "Speaker 1"...
- Pour un mémo (1 speaker) : pas de mapping affiché
```

---

## Conversation 5/8 — Ingestion RAG

```
Contexte : Module Meeting V3 pour ARPET. Lis d'abord docs/SPEC_MEETING_V3.md (section 6). Cette Edge Function va dans le repo Frontend-Baikal.

IMPORTANT : Edge Function dans le repo Baikal. Ne PAS déployer via MCP.

Objectif : Créer le pipeline d'ingestion des transcripts meeting dans le RAG.

Tâches :

1. EDGE FUNCTION "meeting-ingest" :
   - Input : { meeting_id }
   - Étapes :
     a. Récupérer meeting + meeting_items + transcript depuis DB/Storage
     b. Créer une entrée sources.files :
        - layer : 'project' (réunion) ou 'user' (mémo)
        - category : 'transcripts'
        - project_id, org_id, created_by
     c. Construire les chunks :
        - 1 chunk L0 (résumé) :
          • content = résumé meeting + liste sujets abordés
          • metadata = { source_type: "meeting_transcript", meeting_id, meeting_date, meeting_title, participants, lots_discussed, decisions_count, actions_count, formatted_report, category_slug: "transcripts" }
          • qui_lots = tous les lots mentionnés
          • quand_date = meeting_date
          • hierarchy_level = 0
        - N chunks L1 (1 par topic) :
          • content = extrait transcript pour ce topic + items rattachés formatés
          • metadata = { source_type: "meeting_transcript", meeting_id, meeting_date, topic, formatted_report, category_slug: "transcripts" }
          • qui_lots = lots du topic
          • qqoqccp = enrichissement du topic (déjà extrait au Bloc 3)
          • hierarchy_level = 1, parent_chunk_id = id du L0
     d. Générer embeddings OpenAI (1536 dim) pour chaque chunk
     e. Insérer dans rag.documents avec source_meeting_id
     f. Mettre à jour meetings.source_file_id + extraction_status='done'

2. Le regroupement par topic :
   - Utiliser les topic_tags des meeting_items pour regrouper
   - Chaque groupe de items avec le même topic principal = 1 chunk L1
   - Le contenu du chunk = morceaux de transcript pertinents + items formatés
   - Si un sujet n'a pas de meeting_items mais est discuté dans le transcript, il doit quand même avoir un chunk

3. Le formatted_report (CR complet) est stocké en metadata de CHAQUE chunk (L0 et L1)
   → Quand le RAG trouve un chunk pertinent, le CR sert de source affichable

4. Gestion du layer :
   - source_type='memo' → layer='user', status='draft'
   - Autres source_types → layer='project', status='approved'
```

---

## Conversation 6/8 — Historique + Vue Actions

```
Contexte : Module Meeting V3 pour ARPET. Lis d'abord docs/SPEC_MEETING_V3.md (sections 7 et 11).

Objectif : Créer les vues frontend pour l'historique des réunions et le suivi des actions/décisions.

Tâches :

1. COMPOSANT MeetingHistory.tsx (nouveau) :
   - Liste des meetings du projet courant
   - Colonnes : date, titre, source_type (badge), durée, nb items, extraction_status
   - Filtres : par source_type, par date range
   - Clic sur une réunion → ouvre le détail (MeetingStep3Review en mode lecture)
   - Tri par date (plus récent en premier)

2. COMPOSANT MeetingItemsDashboard.tsx (nouveau) :
   - Vue tabulaire des meeting_items du projet
   - Filtres : par type (decision/action/issue/info), par lot, par responsable, par statut
   - Tri : par date, par lot, par responsable
   - Mise en évidence des actions en retard (due_date < now() AND status='open') en rouge
   - Clic sur un item → détail avec contexte + lien vers la réunion source
   - Possibilité de changer le statut d'un item (open → in_progress → done)

3. SERVICE meeting-items.service.ts (nouveau) :
   - getMeetingItems(projectId, filters?) → items avec filtres
   - updateItemStatus(itemId, newStatus, userId) → update status + status_updated_at/by
   - getOverdueActions(projectId) → actions en retard

4. INTÉGRATION :
   - Ajouter une page ou section dans le Dashboard pour accéder à ces vues
   - Navigation dans la Sidebar (icône Calendar ou ClipboardList)
   - Les vues doivent fonctionner même sans aucune réunion (empty states)

5. Vérifier npm run build ✅

UX :
- Mobile-first (ces vues seront utilisées sur le terrain)
- Empty states avec messages explicatifs
- Les badges source_type : 🎙️ recording, 📁 uploaded, 🗣️ memo, 💻 visio
```

---

## Conversation 7/8 — Documents Générés

```
Contexte : Module Meeting V3 pour ARPET. Lis d'abord docs/SPEC_MEETING_V3.md (section 8).

Objectif : Créer la zone UI de génération de documents + l'Edge Function associée.

Tâches :

1. COMPOSANT GenerateDocZone.tsx (nouveau) :
   - 2 cartes : "Mémo de chantier" et "Fiche Lot"
   - Mémo de chantier : bouton "Générer" → loading → aperçu + téléchargement PDF
   - Fiche Lot : sélecteur de lot (alimenté depuis les lots du projet) + bouton "Générer"
   - Section "Documents déjà générés" : liste des PDF précédents avec téléchargement
   - Loading state pendant la génération (peut prendre 15-30s)

2. EDGE FUNCTION "meeting-generate-doc" (repo Baikal) :
   - Input : { type: 'memo_chantier'|'fiche_lot', project_id, org_id, lot_filter?: string }
   - Étapes :
     a. Collecter les données :
        - meeting_items récents (filtré par lot si fiche_lot)
        - Chunks transcripts des dernières réunions
        - Infos projet (core.projects)
        - Intervenants (core.projet_intervenants)
        - Infos entreprise pour branding (core.organizations : nom, logo?)
        - Si fiche_lot : chunks CCTP filtrés par lot (cross-ref)
     b. LLM génère le contenu (template ARPET standard)
     c. Génération PDF (librairie à choisir côté Deno/Edge Function)
     d. Stockage PDF dans Supabase Storage
     e. Créer entrée sources.files (layer: project, category: documents_generes)
   - Output : { success, file_url, file_id }

3. SERVICE meeting-docs.service.ts (nouveau) :
   - generateDocument(type, projectId, lotFilter?) → appel Edge Function
   - getGeneratedDocuments(projectId) → liste des documents générés
   - downloadDocument(fileId) → signed URL pour téléchargement

4. INTÉGRATION :
   - La zone GenerateDocZone est accessible depuis la page projet ou le Dashboard
   - Navigation dans la Sidebar ou dans un onglet dédié

5. Vérifier npm run build ✅

Note : la génération PDF côté Edge Function (Deno) peut nécessiter une librairie comme pdf-lib ou jsPDF. Évaluer les options compatibles Deno.
```

---

## Conversation 8/8 — Tests End-to-End + Stabilisation

```
Contexte : Module Meeting V3 pour ARPET. Toutes les conversations précédentes (1-7) ont été réalisées. Lis docs/SPEC_MEETING_V3.md pour le contexte complet.

Objectif : Tester le flux complet end-to-end, corriger les bugs, stabiliser pour push.

Tâches :

1. TEST FLUX COMPLET — RÉUNION :
   - Enregistrer une réunion courte (30s-1min) via MediaRecorder
   - Vérifier : upload Storage ✅ → Gladia transcription ✅ → extraction items ✅ → CR formaté ✅ → ingestion RAG ✅
   - Vérifier que les chunks apparaissent dans rag.documents avec source_meeting_id
   - Tester une requête RAG qui touche le transcript

2. TEST FLUX — UPLOAD :
   - Uploader un fichier audio existant
   - Vérifier le même pipeline

3. TEST FLUX — MÉMO :
   - Enregistrer un mémo court
   - Vérifier : layer='user', shared_with_team=false, extraction allégée
   - Vérifier la requêtabilité RAG (scope user uniquement)

4. TEST CROSS-REF CHAUD/FROID :
   - Poser une question qui nécessite de croiser un transcript et le CCTP
   - Vérifier que le dual-scope search retourne les 2 types de documents
   - Vérifier que le CR apparaît comme source

5. TEST DOCUMENTS GÉNÉRÉS :
   - Générer un mémo de chantier → vérifier le PDF
   - Générer une fiche lot → vérifier le contenu croisé (CCTP + réunions)

6. TEST HISTORIQUE + ACTIONS :
   - Vérifier la liste des réunions
   - Vérifier les filtres sur les items
   - Tester le changement de statut d'une action
   - Vérifier les actions en retard

7. STABILISATION :
   - Fix tous les bugs trouvés
   - Vérifier la cohérence des types entre frontend et Edge Functions
   - npm run build ✅ final
   - Valider avec l'utilisateur
   - Commit + push si validé

8. MISE À JOUR CLAUDE.md :
   - État courant : Meeting V3 implémenté
   - Liste des fichiers créés/modifiés
   - Prochaines étapes V2
```
