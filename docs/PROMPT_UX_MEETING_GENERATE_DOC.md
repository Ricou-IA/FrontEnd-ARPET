# Prompt de liaison — UX Module Meeting + GenerateDocZone

> Session Frontend-ARPET — À coller dans Claude Code sur le repo Frontend-ARPET
> Date : 2026-02-07

---

## Contexte

Je travaille sur **ARPET**, un assistant IA pour la conduite de travaux BTP. Le module Meeting V3 est fonctionnel (phases 1-7 terminées). La génération de documents (Mémo Chantier / Fiche Lot) est en place côté frontend + Edge Function.

**Objectif de cette session** : améliorer l'UX du module Meeting et de la zone GenerateDocZone. Pas de changement d'architecture, pas de nouvelles features — uniquement du polish UX, de la cohérence visuelle, du responsive mobile et de l'accessibilité.

**Branche** : `refactor/technical-debt`
**Build** : `npm run build` — doit rester ✅ après chaque série de modifications
**Convention** : Tailwind CSS, pas de librairie UI externe, icônes `lucide-react`, mobile-first

---

## Stack & conventions

- React 18 + TypeScript + Vite
- Tailwind CSS (mode clair, palette stone/amber)
- Composants autonomes, pas de shadcn/MUI
- Icônes : `lucide-react`
- Responsive mobile-first (usage terrain smartphone)
- Fichier complet à chaque modification (pas de snippets partiels)

---

## Audit UX réalisé — Problèmes identifiés

### 🔴 Priorité haute (UX cassée ou très friction)

#### 1. SpeakerMapping — Dropdown overflow mobile
**Fichier** : `src/components/meeting/SpeakerMapping.tsx`
**Problème** : Le dropdown de sélection d'intervenant (search + list + create) est rendu inline dans chaque carte speaker. Sur mobile, il déborde de la carte et se superpose aux éléments voisins.
**Solution** : Utiliser un positionnement en popover (`absolute` ou `fixed`) avec détection de viewport, ou convertir en modal plein écran sur mobile.

#### 2. MeetingStep3Review — Contenu tronqué
**Fichier** : `src/components/meeting/MeetingStep3Review.tsx`
**Problème** : Le contenu des onglets (Résumé, Transcript, etc.) est limité à `max-h-[300px]`. Sur mobile, c'est ~40% de l'écran et les transcripts longs sont illisibles. Sur desktop, c'est arbitrairement court.
**Solution** : Remplacer par `max-h-[50vh] md:max-h-[60vh]` pour s'adapter au viewport.

#### 3. MeetingRecordModal — Navigation back incohérente
**Fichier** : `src/components/meeting/MeetingRecordModal.tsx`
**Problème** : Le bouton retour ramène toujours au step précédent, mais depuis `record`, aller en arrière perd l'enregistrement sans confirmation. Depuis `review`, retour vers quoi ?
**Solution** : Ajouter une confirmation avant retour depuis les étapes destructives. Clarifier le flow :
- `mode-select` ← retour ferme le modal
- `prepare/upload/memo` ← retour vers `mode-select`
- `record` ← retour interdit (ou avec confirmation "L'enregistrement sera perdu")
- `processing` ← retour/fermeture interdits
- `review` ← retour impossible, "Terminer" ou "Fermer" uniquement

#### 4. MeetingItemsTab — Mises à jour silencieuses
**Fichier** : `src/components/meeting/MeetingItemsTab.tsx`
**Problème** : Le changement de statut d'un item (open → done) est optimiste mais aucun feedback visuel. L'utilisateur ne sait pas si la sauvegarde a réussi ou échoué.
**Solution** : Ajouter un toast éphémère ("✓ Statut mis à jour") ou un flash vert sur la ligne modifiée. En cas d'erreur, afficher un toast rouge avec "Erreur — statut restauré".

#### 5. Accessibilité — ARIA manquants
**Fichiers** : Tous les composants meeting
**Problème** : Les onglets, indicateurs de progression, champs de formulaire manquent d'attributs ARIA (`aria-current`, `aria-live`, `aria-label`, `aria-describedby`).
**Solution** : Passe d'accessibilité sur les composants clés :
- Onglets : `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`
- Progression : `aria-current="step"`, `aria-label` sur chaque étape
- Timer enregistrement : `aria-live="polite"` pour les lecteurs d'écran
- Champs formulaire : `aria-describedby` lié aux messages d'aide

---

### 🟡 Priorité moyenne (friction UX notable)

#### 6. MeetingProgressIndicator — Étape d'erreur non identifiée
**Fichier** : `src/components/meeting/MeetingProgressIndicator.tsx`
**Problème** : Quand `status='error'`, toutes les étapes actives deviennent rouges. L'utilisateur ne sait pas quelle étape a échoué (envoi ? transcription ? analyse ?).
**Solution** : Marquer uniquement l'étape en erreur avec une icône `X` rouge. Les étapes précédentes restent vertes (complétées), les suivantes restent grises.

#### 7. MeetingUpload — Récupération d'erreur
**Fichier** : `src/components/meeting/MeetingUpload.tsx`
**Problème** : Si le fichier est au mauvais format ou trop gros, l'erreur s'affiche mais aucun bouton de reset. Le drag & drop zone reste bloquée.
**Solution** : Ajouter un bouton "✕" sur l'alerte d'erreur qui clear le state et réinitialise la zone de drop. Ajouter un lien "Formats acceptés" dans l'erreur.

#### 8. MeetingHistoryTab + MeetingItemsTab — États vides
**Fichiers** : `src/components/meeting/MeetingHistoryTab.tsx`, `MeetingItemsTab.tsx`
**Problème** : Quand les filtres produisent 0 résultats, pas de bouton "Réinitialiser les filtres". L'utilisateur doit manuellement clear chaque filtre.
**Solution** : Ajouter un lien "Réinitialiser tous les filtres" dans l'état vide filtré.

#### 9. MeetingItemsTab — Filtres pas évidents
**Fichier** : `src/components/meeting/MeetingItemsTab.tsx`
**Problème** : Les badges de stats (Actions: 5, Decisions: 3) sont cliquables mais rien ne l'indique visuellement. Le curseur est par défaut.
**Solution** : Ajouter `cursor-pointer`, hover underline ou hover bg-change. Ajouter tooltip "Cliquer pour filtrer".

#### 10. Responsive général — Padding/fonts mobiles
**Fichiers** : Tous
**Problème** : Padding trop généreux sur mobile (`px-8`, `p-4`), fonts parfois trop petits (`text-xs`), éléments qui débordent sur <375px.
**Solution** : Passe responsive avec breakpoints `md:` :
- Padding : `px-4 md:px-8`
- Fonts labels : `text-sm md:text-xs` (plus gros sur mobile pour touch)
- Timer/icons : tailles responsive `w-12 h-12 md:w-16 md:h-16`

---

### 🟢 Priorité basse (polish)

#### 11. Animations transitions entre étapes
**Fichier** : `src/components/meeting/MeetingRecordModal.tsx`
**Problème** : Le contenu change abruptement entre steps (mode-select → prepare → record → review).
**Solution** : Ajouter `animate-fadeIn` (ou transition CSS simple) au content wrapper.

#### 12. GenerateDocZone — Boutons et feedback
**Fichier** : `src/components/documents/GenerateDocZone.tsx`
**Problème** :
- Texte bouton générique "Générer le document" identique sur les 2 cartes
- Feedback succès auto-dismiss 5s trop court
- Select natif pour lots (flèche native + ChevronDown custom = doublon)
- Pas d'indication de chargement sur la carte pendant génération
**Solution** :
- Boutons contextuels : "Générer le mémo" / "Générer la fiche lot"
- Success persist 8s ou jusqu'à fermeture manuelle
- Masquer flèche native select avec `appearance-none`
- Ajouter shimmer/skeleton sur la carte pendant la génération

#### 13. MeetingStep1Prepare — État disabled confus
**Fichier** : `src/components/meeting/MeetingStep1Prepare.tsx`
**Problème** : Sans projet sélectionné, tout le formulaire est grisé mais visible. L'utilisateur voit les champs sans comprendre pourquoi ils sont inactifs.
**Solution** : Overlay avec message centré "Sélectionnez un projet pour continuer" au lieu de griser chaque champ individuellement.

#### 14. MeetingMemoRecorder — Indications contextuelles
**Fichier** : `src/components/meeting/MeetingMemoRecorder.tsx`
**Problème** : Le hint "Minimum 3 secondes" n'apparaît que pendant l'enregistrement. Avant l'enregistrement, aucune info sur la durée minimum.
**Solution** : Afficher l'info dans le texte d'aide en état idle : "Les mémos vocaux doivent faire au minimum 3 secondes".

---

## Fichiers concernés (inventaire)

| Fichier | Priorité fixes |
|---------|---------------|
| `src/components/meeting/SpeakerMapping.tsx` | 🔴 #1 dropdown mobile |
| `src/components/meeting/MeetingStep3Review.tsx` | 🔴 #2 hauteur responsive |
| `src/components/meeting/MeetingRecordModal.tsx` | 🔴 #3 nav back + 🟢 #11 animations |
| `src/components/meeting/MeetingItemsTab.tsx` | 🔴 #4 feedback status + 🟡 #8 état vide + 🟡 #9 filtres |
| `src/components/meeting/MeetingProgressIndicator.tsx` | 🟡 #6 étape erreur |
| `src/components/meeting/MeetingUpload.tsx` | 🟡 #7 error recovery |
| `src/components/meeting/MeetingHistoryTab.tsx` | 🟡 #8 état vide + 🟡 #10 responsive |
| `src/components/documents/GenerateDocZone.tsx` | 🟢 #12 boutons/feedback |
| `src/components/meeting/MeetingStep1Prepare.tsx` | 🟢 #13 disabled state |
| `src/components/meeting/MeetingMemoRecorder.tsx` | 🟢 #14 indications |
| `src/pages/MeetingsPage.tsx` | 🟡 #10 responsive header |
| Tous les composants meeting | 🔴 #5 ARIA + 🟡 #10 responsive |

---

## Approche de travail recommandée

1. **Lire chaque fichier** avant modification
2. **Traiter par priorité** : 🔴 → 🟡 → 🟢
3. **Grouper les fixes par fichier** (ne pas toucher le même fichier 3 fois)
4. **`npm run build`** après chaque série de modifications sur 2-3 fichiers
5. **Validation utilisateur** à chaque milestone (haute → moyenne → basse)
6. **Fournir le fichier complet** à chaque modification

### Ordre suggéré

**Sprint 1** (🔴 critiques) :
- SpeakerMapping (#1) → MeetingStep3Review (#2) → MeetingRecordModal (#3)
- Build ✅ → Validation

**Sprint 2** (🔴 + 🟡) :
- MeetingItemsTab (#4, #8, #9) → MeetingProgressIndicator (#6) → MeetingUpload (#7)
- Build ✅ → Validation

**Sprint 3** (🟡 responsive) :
- Passe responsive tous composants (#10) → MeetingHistoryTab (#8)
- Build ✅ → Validation

**Sprint 4** (🔴 ARIA) :
- Passe accessibilité (#5) sur les composants déjà modifiés
- Build ✅ → Validation

**Sprint 5** (🟢 polish) :
- GenerateDocZone (#12) → MeetingStep1Prepare (#13) → MeetingMemoRecorder (#14) → Animations (#11)
- Build ✅ → Validation finale

---

## Points d'attention

- **Ne pas changer l'architecture** — uniquement UX/CSS/accessibilité
- **Ne pas ajouter de dépendance** sauf si indispensable (ex: toast → préférer un composant custom léger)
- **Tester sur 375px** (iPhone SE) comme cible mobile minimale
- **Palette** : stone/amber pour ARPET (pas de bleu, pas de violet)
- **Pas de mode sombre** — ARPET est en mode clair uniquement
- **Commandes en PowerShell** (environnement Windows)
