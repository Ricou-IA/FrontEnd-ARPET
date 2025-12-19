// ============================================================
// ARPET - Marketing Layout
// Version: 1.0.0 - Layout minimaliste pour pages marketing
// Date: 2025-12-18
// ============================================================

import { Outlet } from 'react-router-dom'

export function MarketingLayout() {
  return (
    <div className="font-sans bg-white min-h-screen">
      <Outlet />
    </div>
  )
}

