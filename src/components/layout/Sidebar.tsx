// ============================================================
// ARPET - Sidebar Component
// Version: 4.0.0 - Suppression Sandbox, ajout Discussions
// Date: 2025-12-19
// ============================================================

import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  ChevronLeft, ChevronRight, LogOut,
  FolderOpen, MessageSquare, Video, Trash2
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { useAuth } from '../../hooks/useAuth'
import { ProjectSelector } from '../ui/ProjectSelector'
import { MeetingRecordModal } from '../meeting'
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

  // État pour la modale de réunion
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)
  
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

  // Charger une conversation sauvegardée
  const handleLoadConversation = (conversation: SavedConversation) => {
    loadConversation(conversation)
    // S'assurer qu'on est sur la page chat
    if (location.pathname !== '/app') {
      navigate('/app')
    }
  }

  // Supprimer une conversation
  const handleDeleteConversation = async (conversation: SavedConversation) => {
    setConversationToDelete(conversation)
  }

  const confirmDelete = async () => {
    if (conversationToDelete) {
      await deleteSavedConversation(conversationToDelete.id)
      setConversationToDelete(null)
    }
  }

  // Nouvelle conversation (vide le chat)
  const handleNewConversation = () => {
    clearMessages()
    if (location.pathname !== '/app') {
      navigate('/app')
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

  // Formater la date relative
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return 'Hier'
    if (diffDays < 7) return `Il y a ${diffDays} jours`
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
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

              {/* Couche de Savoir */}
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

          {/* Section Discussions (conversations sauvegardées) */}
          <div>
            {sidebarOpen && (
              <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wide">
                  Discussions
                </h3>
                <button
                  onClick={handleNewConversation}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  + Nouveau
                </button>
              </div>
            )}
            <div className="space-y-1">
              {savedConversationsLoading ? (
                sidebarOpen && (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                  </div>
                )
              ) : savedConversations.length === 0 ? (
                sidebarOpen && (
                  <p className="text-xs text-stone-400 dark:text-stone-500 px-2 py-2 italic">
                    Aucune discussion sauvegardée
                  </p>
                )
              ) : (
                savedConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`group/conv flex items-center rounded-lg transition ${
                      sidebarOpen ? 'px-2 py-2' : 'justify-center p-2'
                    } text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50`}
                  >
                    <button
                      onClick={() => handleLoadConversation(conversation)}
                      title={!sidebarOpen ? conversation.title : undefined}
                      className={`flex items-center flex-1 min-w-0 ${sidebarOpen ? 'gap-3' : ''}`}
                    >
                      {/* Icône */}
                      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4 text-stone-400" />
                      </div>
                      
                      {/* Titre et date */}
                      {sidebarOpen && (
                        <div className="text-left flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate">
                            {conversation.title}
                          </span>
                          <span className="block text-[10px] text-stone-400 dark:text-stone-500">
                            {formatRelativeDate(conversation.updated_at)}
                          </span>
                        </div>
                      )}
                    </button>

                    {/* Bouton supprimer */}
                    {sidebarOpen && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteConversation(conversation)
                        }}
                        className="p-1 rounded opacity-0 group-hover/conv:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-stone-400 hover:text-red-500 transition-all"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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

      {/* Modal de confirmation suppression */}
      {conversationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setConversationToDelete(null)}
          />
          <div className="relative bg-white dark:bg-stone-900 rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-2">
              Supprimer cette discussion ?
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
              "{conversationToDelete.title}" sera définitivement supprimée.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConversationToDelete(null)}
                className="px-4 py-2 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour enregistrement de réunion */}
      <MeetingRecordModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
      />
    </>
  )
}
