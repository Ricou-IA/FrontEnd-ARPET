// ============================================================
// ARPET - Sidebar Component
// Version: 5.1.0 - With Connectors Modal
// Date: 2026-01-03
// ============================================================

import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { useAuth } from '../../hooks/useAuth'
import { ProjectSelector } from '../ui/ProjectSelector'
import { MeetingRecordModal } from '../meeting'
import { ConnectorsModal } from '../ui/ConnectorsModal'
import { SidebarNavigation } from './sidebar/SidebarNavigation'
import { SidebarConversations } from './sidebar/SidebarConversations'
import { SidebarProfile } from './sidebar/SidebarProfile'
import type { Project, SavedConversation } from '../../types'

interface SidebarProps {
  projects: Project[]
}

export function Sidebar({ projects }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    sidebarOpen,
    toggleSidebar,
    savedConversations,
    savedConversationsLoading,
    fetchSavedConversations,
    loadConversation,
    deleteSavedConversation,
    clearMessages,
  } = useAppStore()
  const { profile, signOut } = useAuth()

  // États pour les modales
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)
  const [isConnectorsModalOpen, setIsConnectorsModalOpen] = useState(false)

  // État pour la conversation à supprimer (confirmation)
  const [conversationToDelete, setConversationToDelete] = useState<SavedConversation | null>(null)

  // Charger les conversations sauvegardées au montage
  useEffect(() => {
    fetchSavedConversations()
  }, [fetchSavedConversations])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleLoadConversation = (conversation: SavedConversation) => {
    loadConversation(conversation)
    if (location.pathname !== '/app') {
      navigate('/app')
    }
  }

  const handleDeleteConversation = (conversation: SavedConversation) => {
    setConversationToDelete(conversation)
  }

  const confirmDelete = async () => {
    if (conversationToDelete) {
      await deleteSavedConversation(conversationToDelete.id)
      setConversationToDelete(null)
    }
  }

  const handleNewConversation = () => {
    clearMessages()
    if (location.pathname !== '/app') {
      navigate('/app')
    }
  }

  const handleNavigate = (path: string) => {
    navigate(path)
  }

  return (
    <>
      <aside
        className={`
          ${sidebarOpen ? 'w-[280px]' : 'w-[70px]'}
          bg-[#f5f5f4]/80 dark:bg-stone-900/80 backdrop-blur-md
          flex flex-col border-r border-stone-200/50 dark:border-stone-800/50
          flex-shrink-0 z-20 relative group
          transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
        `}
      >
        {/* Toggle button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-8 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-full p-1 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 shadow-sm z-50 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Header: Sélecteur de projet */}
        <div className={`flex-shrink-0 flex items-center justify-center transition-all ${sidebarOpen ? 'p-5 h-20' : 'p-3 h-20'
          }`}>
          <ProjectSelector projects={projects} collapsed={!sidebarOpen} />
        </div>

        {/* Contenu scrollable */}
        <div className={`flex-1 overflow-y-auto py-2 space-y-6 ${sidebarOpen ? 'px-4' : 'px-3'}`}>
          <SidebarNavigation
            expanded={sidebarOpen}
            activeRoute={location.pathname}
            onNavigate={handleNavigate}
            onOpenConnectors={() => setIsConnectorsModalOpen(true)}
            onOpenMeeting={() => setIsMeetingModalOpen(true)}
          />

          {/* Séparateur subtil */}
          <div className={`h-px bg-gradient-to-r from-transparent via-stone-200 dark:via-stone-700 to-transparent ${sidebarOpen ? 'mx-2' : 'mx-1'}`} />

          <SidebarConversations
            expanded={sidebarOpen}
            conversations={savedConversations}
            loading={savedConversationsLoading}
            onLoadConversation={handleLoadConversation}
            onDeleteConversation={handleDeleteConversation}
            onNewConversation={handleNewConversation}
          />
        </div>

        <SidebarProfile
          expanded={sidebarOpen}
          fullName={profile?.full_name}
          businessRole={profile?.business_role}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Modal de confirmation suppression */}
      {conversationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm"
            onClick={() => setConversationToDelete(null)}
          />
          <div className="relative bg-white dark:bg-stone-900 rounded-2xl shadow-xl p-6 max-w-sm w-full ring-1 ring-stone-900/5 scale-100 animate-[fadeInUp_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200 mb-2 font-serif">
              Supprimer cette discussion ?
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-6 leading-relaxed">
              La discussion <strong className="text-stone-800 dark:text-stone-300">"{conversationToDelete.title}"</strong> sera définitivement supprimée.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConversationToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg shadow-red-500/30 transition hover:-translate-y-0.5"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <MeetingRecordModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
      />

      <ConnectorsModal
        isOpen={isConnectorsModalOpen}
        onClose={() => setIsConnectorsModalOpen(false)}
      />
    </>
  )
}
