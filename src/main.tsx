// ============================================================
// ARPET - Main Entry Point
// Version: 2.0.0 - Simplifié, le nettoyage est géré dans useAuth
// ============================================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ============================================================
// DÉMARRAGE REACT
// Note: Le nettoyage du cache auth est géré dans useAuth.ts
// pour éviter les race conditions
// ============================================================

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
