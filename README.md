# Arpet - Frontend React

Assistant intelligent pour conducteurs de travaux BTP.

## 🚀 Démarrage rapide

```bash
# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Build production
npm run build
```

## 📁 Structure du projet

```
src/
├── components/
│   ├── auth/
│   │   └── LoginPage.tsx      # Page de connexion
│   ├── chat/
│   │   ├── ChatArea.tsx       # Zone principale de chat
│   │   ├── ChatInput.tsx      # Input de saisie
│   │   └── MessageBubble.tsx  # Bulle de message
│   ├── layout/
│   │   ├── Sidebar.tsx        # Barre latérale
│   │   └── MainContent.tsx    # Contenu principal
│   ├── sandbox/
│   │   ├── SandboxCard.tsx    # Carte du bac à sable
│   │   └── SandboxGrid.tsx    # Grille du bac à sable
│   └── ui/
│       └── ProjectSelector.tsx # Sélecteur de chantier
├── hooks/
│   └── useAuth.ts             # Hook d'authentification
├── lib/
│   └── supabase.ts            # Client Supabase
├── stores/
│   └── appStore.ts            # Store Zustand
├── types/
│   └── index.ts               # Types TypeScript
├── App.tsx                    # Composant racine
├── main.tsx                   # Point d'entrée
└── index.css                  # Styles globaux
```

## 🎨 Design System

### Couleurs (Tailwind)
- **Fond principal:** `bg-[#FAFAF9]` (Stone-50)
- **Fond sidebar:** `bg-[#F5F5F4]` (Stone-100)
- **Texte principal:** `text-stone-800`
- **Texte secondaire:** `text-stone-500`
- **Accent profil:** `#9B2C2C` (Rouge brique)

### Typographie
- **Titres:** `font-family: 'Instrument Serif', serif`
- **Corps:** `font-family: 'Inter', sans-serif`

## 🔌 Connexion Backend

### Supabase
Le client est configuré dans `src/lib/supabase.ts` avec :
- URL: `https://odspcxgafcqxjzrarsqf.supabase.co`
- Auth: Email/Password

### Tables utilisées
- `profiles` - Profils utilisateurs
- `projects` - Chantiers (projets)
- `project_members` - Accès aux chantiers
- `organizations` - Organisations

## 🔧 Prochaines étapes

### Sprint 2 - Connexion données
- [ ] Brancher les vrais chantiers depuis Supabase
- [ ] Persister le chantier actif
- [ ] Sauvegarder les items du bac à sable

### Sprint 3 - Agent RAG
- [ ] Endpoint Chat (Edge Function)
- [ ] Streaming SSE
- [ ] Historique des conversations

## 📝 Notes

- Les messages du chat sont **volatiles** (non persistés)
- L'ancrage crée un item dans le bac à sable
- La sidebar est rétractable avec transition fluide
