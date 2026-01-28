// ============================================================
// ARPET - Main Entry Point
// Version: 2.1.0 - Ajout Vercel Analytics & Speed Insights
// ============================================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
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
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>,
)
