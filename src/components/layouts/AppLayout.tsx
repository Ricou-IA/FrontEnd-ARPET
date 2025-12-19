// ============================================================
// ARPET - App Layout
// Version: 1.3.0 - Ajout bouton Réunion
// Date: 2025-12-18
// ============================================================

import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { MessageSquare, FileText, Settings, Video } from 'lucide-react'
import { MeetingRecordModal } from '../meeting'
import { SplitViewPanel } from '../viewer'
import { useAppStore } from '../../stores/appStore'

export function AppLayout() {
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)
  const { viewerOpen } = useAppStore()

  return (
    <>
      <div className="h-screen w-full flex overflow-hidden bg-white bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        {/* Sidebar gauche fixe - Effet Verre */}
        <aside className="w-16 bg-zinc-50/90 backdrop-blur-md border-r border-gray-200 flex flex-col items-center py-6 flex-shrink-0 h-full">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="font-serif text-2xl font-semibold text-[#0B0F17]">Arpet.</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 flex flex-col gap-2">
            <NavLink
              to="/app"
              end
              className={({ isActive }) =>
                `w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
                  isActive
                    ? 'bg-white text-[#0B0F17] shadow'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-[#0B0F17]'
                }`
              }
              title="Chat"
            >
              <MessageSquare className="w-5 h-5" />
            </NavLink>
            
            <NavLink
              to="/app/documents"
              className={({ isActive }) =>
                `w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
                  isActive
                    ? 'bg-white text-[#0B0F17] shadow'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-[#0B0F17]'
                }`
              }
              title="Documents"
            >
              <FileText className="w-5 h-5" />
            </NavLink>

            {/* Bouton Réunion */}
            <button
              onClick={() => setIsMeetingModalOpen(true)}
              className="w-12 h-12 flex items-center justify-center rounded-lg transition-colors bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 border border-amber-200"
              title="Réunion"
            >
              <Video className="w-5 h-5" />
            </button>
          </nav>

          {/* Bouton Paramètres */}
          <NavLink
            to="/app/settings"
            className={({ isActive }) =>
              `w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
                isActive
                  ? 'bg-white text-[#0B0F17] shadow'
                  : 'bg-[#0B0F17] text-white hover:bg-[#0B0F17]/90'
              }`
            }
            title="Paramètres"
          >
            <Settings className="w-5 h-5" />
          </NavLink>
        </aside>

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

      {/* Modal pour enregistrement de réunion */}
      <MeetingRecordModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
      />
    </>
  )
}

