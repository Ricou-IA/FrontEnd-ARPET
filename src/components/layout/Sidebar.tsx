// ============================================================
// ARPET - Sidebar Component
// Version: 3.4.0 - Simplification navigation (suppression Contexte)
// Date: 2025-12-19
// ============================================================

import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  ChevronLeft, ChevronRight, LogOut,
  Book, BarChart3, FolderOpen, MessageSquare, Video
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { useAuth } from '../../hooks/useAuth'
import { ProjectSelector } from '../ui/ProjectSelector'
import { useSandboxItems } from '@/hooks/useSandbox'
import { SandboxEditor } from '../sandbox/SandboxEditor'
import { MeetingRecordModal } from '../meeting'
import type { Project, SandboxItem } from '../../types'

interface SidebarProps {
  projects: Project[]
}

export function Sidebar({ projects }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { sidebarOpen, toggleSidebar } = useAppStore()
  const { profile, signOut } = useAuth()
  const { items: sandboxItems } = useSandboxItems()

  // État pour ouvrir l'éditeur d'un item pinned
  const [selectedPinnedItem, setSelectedPinnedItem] = useState<SandboxItem | null>(null)
  
  // État pour la modale de réunion
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Items épinglés (status = 'pinned')
  const pinnedItems = sandboxItems.filter(item => item.status === 'pinned')

  // Déterminer le type d'agent et l'icône
  const getAgentIcon = (item: SandboxItem) => {
    // Vérifier si c'est un CR de réunion
    if (item.content.source_type === 'meeting_cr') {
      return <Video className="w-4 h-4 text-amber-500" />
    }
    if (item.content.routine) {
      return <BarChart3 className="w-4 h-4 text-orange-500" />
    }
    return <Book className="w-4 h-4 text-blue-500" />
  }

  // Ouvrir un item pinned
  const handlePinnedItemClick = (item: SandboxItem) => {
    setSelectedPinnedItem(item)
  }

  // Callback update
  const handleItemUpdate = (updatedItem: SandboxItem) => {
    setSelectedPinnedItem(updatedItem)
    // Si l'item a été dépinglé (édité), fermer le modal
    if (updatedItem.status === 'draft') {
      setSelectedPinnedItem(null)
    }
  }

  // Navigation helpers
  const isActive = (path: string) => location.pathname === path

  const handleNavigate = (path: string) => {
    navigate(path)
  }

  // Routes de l'application
  const routes = {
    chat: '/app',
    documents: '/app/documents',
  }

  return (
    <>
      <aside
        className={`
          ${sidebarOpen ? 'w-[280px]' : 'w-[60px]'}
          bg-[#F5F5F4] dark:bg-stone-900 flex flex-col border-r border-stone-200 dark:border-stone-800 flex-shrink-0 z-20 relative group
          transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        `}
      >
        {/* Toggle button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-6 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-full p-1 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 shadow-sm z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Header: Sélecteur de projet */}
        <div className={`flex-shrink-0 border-b border-stone-200 dark:border-stone-800 flex items-center justify-center ${
          sidebarOpen ? 'p-4 h-16' : 'p-2 h-14'
        }`}>
          <ProjectSelector projects={projects} collapsed={!sidebarOpen} />
        </div>

        {/* Contenu scrollable */}
        <div className={`flex-1 overflow-y-auto py-4 space-y-4 ${sidebarOpen ? 'px-3' : 'px-2'}`}>

          {/* Section Navigation */}
          <div>
            {sidebarOpen && (
              <h3 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-2 px-2">
                Navigation
              </h3>
            )}
            <div className="space-y-1">
              {/* Chat */}
              <button
                onClick={() => handleNavigate(routes.chat)}
                title={!sidebarOpen ? 'Chat' : undefined}
                className={`w-full flex items-center rounded-lg transition group ${
                  sidebarOpen ? 'gap-3 px-2 py-2' : 'justify-center p-2'
                } ${
                  isActive(routes.chat)
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm ${
                  isActive(routes.chat)
                    ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800'
                    : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400'
                }`}>
                  <MessageSquare className="w-4 h-4" />
                </div>
                {sidebarOpen && (
                  <div className="text-left flex-1 min-w-0">
                    <span className="block text-sm font-medium">Chat</span>
                  </div>
                )}
              </button>

              {/* Couche de Savoir (anciennement Documents) */}
              <button
                onClick={() => handleNavigate(routes.documents)}
                title={!sidebarOpen ? 'Couche de Savoir' : undefined}
                className={`w-full flex items-center rounded-lg transition group ${
                  sidebarOpen ? 'gap-3 px-2 py-2' : 'justify-center p-2'
                } ${
                  isActive(routes.documents)
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm ${
                  isActive(routes.documents)
                    ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800'
                    : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400'
                }`}>
                  <FolderOpen className="w-4 h-4" />
                </div>
                {sidebarOpen && (
                  <div className="text-left flex-1 min-w-0">
                    <span className="block text-sm font-medium">Couche de Savoir</span>
                  </div>
                )}
              </button>

              {/* Réunion */}
              <button 
                onClick={() => setIsMeetingModalOpen(true)}
                title={!sidebarOpen ? 'Réunion' : undefined}
                className={`w-full flex items-center rounded-lg transition group ${
                  sidebarOpen ? 'gap-3 px-2 py-2' : 'justify-center p-2'
                } text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 hover:text-stone-900 dark:hover:text-stone-100`}
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400">
                  <Video className="w-4 h-4" />
                </div>
                {sidebarOpen && (
                  <div className="text-left flex-1 min-w-0">
                    <span className="block text-sm font-medium">Réunion</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Séparateur */}
          <div className={`h-px bg-stone-200 dark:bg-stone-700 ${sidebarOpen ? 'mx-0' : 'mx-1'}`} />

          {/* Section Espace de travail (Pinned) */}
          <div>
            {sidebarOpen && (
              <h3 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-2 px-2">
                Espace de travail
              </h3>
            )}
            <div className="space-y-1">
              {pinnedItems.length === 0 ? (
                sidebarOpen && (
                  <p className="text-xs text-stone-400 dark:text-stone-500 px-2 py-2 italic">
                    Aucun rapport épinglé
                  </p>
                )
              ) : (
                pinnedItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handlePinnedItemClick(item)}
                    title={!sidebarOpen ? item.title : undefined}
                    className={`w-full flex items-center rounded-lg transition group ${
                      sidebarOpen ? 'gap-3 px-2 py-2' : 'justify-center p-2'
                    } text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 hover:text-stone-900 dark:hover:text-stone-100`}
                  >
                    {/* Icône selon type d'agent */}
                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                      {getAgentIcon(item)}
                    </div>
                    
                    {/* Titre */}
                    {sidebarOpen && (
                      <div className="text-left flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">
                          {item.title}
                        </span>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Profil en bas de sidebar */}
        <div className={`border-t border-stone-200 dark:border-stone-800 mt-auto ${sidebarOpen ? 'p-4' : 'p-2'}`}>
          <div className={`w-full flex items-center text-stone-800 dark:text-stone-200 rounded-lg group ${
            sidebarOpen ? 'gap-3 px-2 py-2' : 'justify-center p-1'
          }`}>
            {/* Avatar */}
            <div className={`rounded-full bg-[#9B2C2C] text-white flex items-center justify-center font-serif border-2 border-white dark:border-stone-800 shadow-sm flex-shrink-0 ${
              sidebarOpen ? 'w-9 h-9 text-sm' : 'w-8 h-8 text-xs'
            }`}>
              {profile?.full_name?.charAt(0) || 'U'}
            </div>

            {/* Infos utilisateur */}
            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {profile?.full_name || 'Utilisateur'}
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                    {profile?.business_role || 'Membre'}
                  </p>
                </div>

                {/* Bouton déconnexion */}
                <button
                  onClick={handleSignOut}
                  className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition opacity-0 group-hover:opacity-100"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Modal pour item pinned */}
      {selectedPinnedItem && (
        <SandboxEditor
          item={selectedPinnedItem}
          onClose={() => setSelectedPinnedItem(null)}
          onUpdate={handleItemUpdate}
          onDelete={() => setSelectedPinnedItem(null)}
        />
      )}

      {/* Modal pour enregistrement de réunion */}
      <MeetingRecordModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
      />
    </>
  )
}
