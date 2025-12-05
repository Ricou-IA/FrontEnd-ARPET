// ============================================================
// ARPET - Main Entry Point
// Version: 1.1.0 - Auto-clean corrupted auth cache on startup
// ============================================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ============================================================
// NETTOYAGE DU CACHE AUTH AVANT DÉMARRAGE
// Exécuté AVANT React pour éviter le blocage sur l'écran de chargement
// ============================================================

const SUPABASE_AUTH_KEY = 'sb-odspcxgafcqxjzrarsqf-auth-token'

try {
  const stored = localStorage.getItem(SUPABASE_AUTH_KEY)
  
  if (stored) {
    const parsed = JSON.parse(stored)
    
    // Vérifier la structure minimale requise
    if (!parsed?.access_token) {
      console.warn('[Auth] Invalid cache structure, clearing...')
      localStorage.removeItem(SUPABASE_AUTH_KEY)
    } 
    // Vérifier si le token est expiré depuis trop longtemps
    else if (parsed.expires_at) {
      const expiresAt = parsed.expires_at * 1000 // Convertir en ms
      const now = Date.now()
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      
      if (expiresAt < now - sevenDaysMs) {
        console.warn('[Auth] Token expired > 7 days, clearing...')
        localStorage.removeItem(SUPABASE_AUTH_KEY)
      }
    }
  }
} catch (error) {
  // JSON invalide ou autre erreur → nettoyer
  console.warn('[Auth] Corrupted cache, clearing...', error)
  localStorage.removeItem(SUPABASE_AUTH_KEY)
}

// ============================================================
// DÉMARRAGE REACT
// ============================================================

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
