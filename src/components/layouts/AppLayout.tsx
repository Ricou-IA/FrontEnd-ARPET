// ============================================================
// ARPET - App Layout
// Version: 2.0.0 - Restauration Sidebar complète avec toggle
// Date: 2025-12-19
// ============================================================

import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../layout/Sidebar'
import { SplitViewPanel } from '../viewer'
import { useAppStore } from '../../stores/appStore'

export function AppLayout() {
  const { viewerOpen, userProjects, fetchUserProjects } = useAppStore()

  // Charger les projets au montage
  useEffect(() => {
    fetchUserProjects()
  }, [fetchUserProjects])

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white dark:bg-stone-950 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
      {/* Sidebar complète avec toggle */}
      <Sidebar projects={userProjects} />

      {/* Conteneur flex horizontal pour Main + Viewer */}
      <div className="flex-1 flex overflow-hidden h-full relative">
        {/* Zone principale */}
        <main className={`flex-1 overflow-hidden bg-transparent h-full transition-all ${viewerOpen ? 'min-w-0 md:mr-0' : ''}`}>
          <Outlet />
        </main>

        {/* Viewer PDF (Split View) - Conditionnel */}
        {viewerOpen && (
          <>
            {/* Overlay sur mobile */}
            <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => useAppStore.getState().closeViewer()} />

            {/* Viewer - Overlay sur mobile, Split sur desktop */}
            <div className="fixed md:relative inset-0 md:inset-auto md:flex-shrink-0 h-full overflow-hidden z-50 md:z-auto">
              <SplitViewPanel />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

