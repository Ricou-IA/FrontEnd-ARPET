import { ChevronLeft, ChevronRight, Globe, FileText, Plus, LogOut } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { useAuth } from '../../hooks/useAuth'
import { ProjectSelector } from '../ui/ProjectSelector'
import { useSandboxItems } from '@/hooks/useSandbox'
import type { Project, SandboxItem } from '../../types'

interface SidebarProps {
  projects: Project[]
}

export function Sidebar({ projects }: SidebarProps) {
  const { sidebarOpen, toggleSidebar } = useAppStore()
  const { profile, signOut } = useAuth()
  const { items: sandboxItems } = useSandboxItems()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Items épinglés dans l'espace de travail (status = 'pinned')
  const workspaceItems = sandboxItems.filter(item => item.status === 'pinned')

  // Déterminer la couleur du point selon le contenu
  const getItemColor = (item: SandboxItem): string => {
    if (item.content.routine) return 'bg-orange-400' // Analyse avec routine
    if (item.content.messages && item.content.messages.length > 0) return 'bg-blue-400' // Conversation
    return 'bg-green-500' // Note ou autre
  }

  return (
    <aside
      className={`
        ${sidebarOpen ? 'w-[280px]' : 'w-[70px] sidebar-collapsed'}
        bg-[#F5F5F4] flex flex-col border-r border-stone-200 flex-shrink-0 z-20 relative group
        transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
      `}
    >
      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 bg-white border border-stone-200 rounded-full p-1 text-stone-400 hover:text-stone-800 shadow-sm z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Header: Sélecteur de projet */}
      <div className="p-4 flex-shrink-0 border-b border-transparent h-16 flex items-center sidebar-header">
        <ProjectSelector projects={projects} collapsed={!sidebarOpen} />
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">

        {/* Section Contexte */}
        <div>
          <h3 className="section-title text-[10px] font-bold text-stone-400 uppercase tracking-wide mb-2 px-2">
            Contexte
          </h3>
          <div className="space-y-1">
            {/* Couche de Savoir */}
            <button className="sidebar-item w-full flex items-center gap-3 px-2 py-2 text-stone-600 hover:bg-stone-200/50 hover:text-stone-900 rounded-lg transition group">
              <div className="w-8 h-8 rounded-md bg-white border border-stone-200 flex items-center justify-center flex-shrink-0 text-stone-500 shadow-sm">
                <Globe className="w-4 h-4" />
              </div>
              <div className="sidebar-text text-left flex-1 min-w-0">
                <span className="block text-sm font-medium">Couche de Savoir</span>
              </div>
            </button>

            {/* Mes Connaissances */}
            <button className="sidebar-item w-full flex items-center gap-3 px-2 py-2 text-stone-600 hover:bg-stone-200/50 hover:text-stone-900 rounded-lg transition group">
              <div className="w-8 h-8 rounded-md bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                <FileText className="w-4 h-4" />
              </div>
              <div className="sidebar-text text-left flex-1 min-w-0">
                <span className="block text-sm font-medium">Mes Connaissances</span>
              </div>
            </button>

            {/* Ajouter source */}
            <button className="sidebar-item w-full flex items-center gap-3 px-2 py-2 text-stone-400 hover:text-stone-700 hover:bg-white rounded-lg transition group border border-transparent hover:border-stone-200 border-dashed mt-2">
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5" />
              </div>
              <div className="sidebar-text text-left flex-1 min-w-0">
                <span className="block text-xs font-medium">Ajouter source</span>
              </div>
            </button>
          </div>
        </div>

        {/* Séparateur */}
        {sidebarOpen && (
          <div className="w-full h-px bg-stone-200 my-2" />
        )}

        {/* Section Espace de travail */}
        <div>
          <h3 className="section-title text-[10px] font-bold text-stone-400 uppercase tracking-wide mb-2 px-2">
            Espace de travail
          </h3>
          <div className="space-y-1">
            {workspaceItems.length === 0 ? (
              <p className="sidebar-text text-xs text-stone-400 px-2 py-2">
                Aucun élément épinglé
              </p>
            ) : (
              workspaceItems.map((item) => (
                <button
                  key={item.id}
                  className="sidebar-item w-full flex items-center gap-3 px-2 py-2 text-stone-600 hover:bg-stone-200/50 hover:text-stone-900 rounded-lg transition group"
                >
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <span className={`w-2 h-2 rounded-full ${getItemColor(item)}`} />
                  </div>
                  <div className="sidebar-text text-left flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{item.title}</span>
                  </div>
                </button>
              ))
            )}

            {/* Items par défaut pour la démo (seulement si aucun item réel) */}
            {workspaceItems.length === 0 && (
              <>
                <button className="sidebar-item w-full flex items-center gap-3 px-2 py-2 text-stone-600 hover:bg-stone-200/50 hover:text-stone-900 rounded-lg transition group">
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <div className="sidebar-text text-left flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">Planning Chantier</span>
                  </div>
                </button>
                <button className="sidebar-item w-full flex items-center gap-3 px-2 py-2 text-stone-600 hover:bg-stone-200/50 hover:text-stone-900 rounded-lg transition group">
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-stone-300" />
                  </div>
                  <div className="sidebar-text text-left flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">Suivi Budget Lot 04</span>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profil en bas de sidebar */}
      <div className="p-4 border-t border-stone-200 mt-auto">
        <div className="sidebar-item w-full flex items-center gap-3 px-2 py-2 text-stone-800 rounded-lg group text-left">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-[#9B2C2C] text-white flex items-center justify-center font-serif text-sm border-2 border-white shadow-sm flex-shrink-0">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>

          {/* Infos utilisateur */}
          <div className="sidebar-text flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">
              {profile?.full_name || 'Utilisateur'}
            </p>
            <p className="text-[10px] text-stone-500 truncate">
              {profile?.business_role || 'Membre'}
            </p>
          </div>

          {/* Bouton déconnexion */}
          <button
            onClick={handleSignOut}
            className="sidebar-text p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition opacity-0 group-hover:opacity-100"
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
