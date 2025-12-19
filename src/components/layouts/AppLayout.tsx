// ============================================================
// ARPET - App Layout
// Version: 1.2.0 - Navigation avec NavLink
// Date: 2025-12-18
// ============================================================

import { Outlet, NavLink } from 'react-router-dom'
import { MessageSquare, FileText, Settings } from 'lucide-react'

export function AppLayout() {
  return (
    <div className="min-h-screen w-full flex overflow-hidden bg-white bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
      {/* Sidebar gauche fixe - Effet Verre */}
      <aside className="w-16 bg-zinc-50/90 backdrop-blur-md border-r border-gray-200 flex flex-col items-center py-6">
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

      {/* Zone principale */}
      <main className="flex-1 overflow-hidden bg-transparent">
        <Outlet />
      </main>
    </div>
  )
}

