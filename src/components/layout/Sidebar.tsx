// ============================================================
// ARPET - Sidebar Component
// Version: 5.0.0 - "Sexy" Revamp
// Date: 2026-01-03
// ============================================================

import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, LogOut,
  FolderOpen, MessageSquare, Video, Trash2, Plus
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
          ${sidebarOpen ? 'w-[280px]' : 'w-[70px]'}
          bg-[#f5f5f4]/80 dark:bg-stone-900/80 backdrop-blur-md
          flex flex-col border-r border-stone-200/50 dark:border-stone-800/50 
          flex-shrink-0 z-20 relative group
          transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
        `}
      >
        {/* Toggle button - More subtle */}
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

          {/* Section Navigation */}
          <div className="space-y-1">
            {sidebarOpen && (
              <h3 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-3 px-2">
                Menu
              </h3>
            )}

            {/* Chat */}
            <NavItem
              icon={<MessageSquare className="w-[18px] h-[18px]" />}
              label="Chat"
              isActive={isActive(routes.chat)}
              expanded={sidebarOpen}
              onClick={() => handleNavigate(routes.chat)}
            />

            {/* Couche de Savoir */}
            <NavItem
              icon={<FolderOpen className="w-[18px] h-[18px]" />}
              label="Savoir"
              isActive={isActive(routes.documents)}
              expanded={sidebarOpen}
              onClick={() => handleNavigate(routes.documents)}
            />

            {/* Réunion */}
            <NavItem
              icon={<Video className="w-[18px] h-[18px]" />}
              label="Réunion"
              isActive={false} // Pas de route active pour modal
              expanded={sidebarOpen}
              onClick={() => setIsMeetingModalOpen(true)}
              variant="amber"
            />
          </div>

          {/* Séparateur subtil */}
          <div className={`h-px bg-gradient-to-r from-transparent via-stone-200 dark:via-stone-700 to-transparent ${sidebarOpen ? 'mx-2' : 'mx-1'}`} />

          {/* Section Discussions */}
          <div>
            {sidebarOpen && (
              <div className="flex items-center justify-between mb-3 px-2">
                <h3 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                  Discussions
                </h3>
                <button
                  onClick={handleNewConversation}
                  className="p-1 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors rounded hover:bg-stone-200/50 dark:hover:bg-stone-800/50"
                  title="Nouvelle discussion"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="space-y-1">
              {savedConversationsLoading ? (
                sidebarOpen && (
                  <div className="flex items-center justify-center py-4 opacity-50">
                    <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                  </div>
                )
              ) : savedConversations.length === 0 ? (
                sidebarOpen && (
                  <div className="px-2 py-4 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-lg">
                    <p className="text-xs text-stone-400 dark:text-stone-500 italic">
                      Aucune discussion
                    </p>
                  </div>
                )
              ) : (
                savedConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="group/conv relative"
                  >
                    <button
                      onClick={() => handleLoadConversation(conversation)}
                      title={!sidebarOpen ? conversation.title : undefined}
                      className={`
                        w-full flex items-center rounded-lg transition-all duration-200
                        ${sidebarOpen ? 'gap-3 px-3 py-2.5 text-left' : 'justify-center p-2.5'}
                        hover:bg-white dark:hover:bg-stone-800 hover:shadow-sm
                        text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200
                      `}
                    >
                      <MessageSquare className="w-4 h-4 flex-shrink-0 text-stone-400 dark:text-stone-600" />

                      {sidebarOpen && (
                        <div className="flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate">
                            {conversation.title}
                          </span>
                          <span className="block text-[10px] text-stone-400 font-medium">
                            {formatRelativeDate(conversation.updated_at)}
                          </span>
                        </div>
                      )}
                    </button>

                    {/* Bouton supprimer (survol) */}
                    {sidebarOpen && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteConversation(conversation)
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md 
                          opacity-0 group-hover/conv:opacity-100 
                          text-stone-400 hover:text-red-500 hover:bg-stone-100 dark:hover:bg-stone-700
                          transition-all"
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
        <div className={`mt-auto ${sidebarOpen ? 'p-4' : 'p-3'}`}>
          <div className={`
            w-full flex items-center bg-white dark:bg-stone-800 border border-stone-200/50 dark:border-stone-700/50
            rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group
            ${sidebarOpen ? 'gap-3 px-3 py-3' : 'justify-center p-1.5 aspect-square'}
          `}>
            {/* Avatar */}
            <div className={`
              rounded-lg bg-gradient-to-br from-arpet-accent to-arpet-accent-light text-white 
              flex items-center justify-center font-serif font-bold shadow-inner flex-shrink-0
              ${sidebarOpen ? 'w-9 h-9 text-sm' : 'w-8 h-8 text-xs'}
            `}>
              {profile?.full_name?.charAt(0) || 'U'}
            </div>

            {/* Infos utilisateur */}
            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate leading-tight">
                    {profile?.full_name || 'Utilisateur'}
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate font-medium">
                    {profile?.business_role || 'Membre'}
                  </p>
                </div>

                <button
                  onClick={handleSignOut}
                  className="p-1.5 text-stone-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
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
    </>
  )
}

// Sous-composant pour les items de navigation
interface NavItemProps {
  icon: React.ReactNode
  label: string
  isActive: boolean
  expanded: boolean
  onClick: () => void
  variant?: 'default' | 'amber'
}

function NavItem({ icon, label, isActive, expanded, onClick, variant = 'default' }: NavItemProps) {
  const isAmber = variant === 'amber'

  return (
    <button
      onClick={onClick}
      title={!expanded ? label : undefined}
      className={`
        w-full flex items-center rounded-xl transition-all duration-200 group relative overflow-hidden
        ${expanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5'}
        ${isActive
          ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-stone-900/5'
          : 'text-stone-500 dark:text-stone-400 hover:bg-white/60 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-100'
        }
      `}
    >
      {/* Active Indicator Strip */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-arpet-accent rounded-r-full" />
      )}

      <div className={`
        flex items-center justify-center flex-shrink-0 transition-colors
        ${isActive ? 'text-arpet-accent' : isAmber ? 'text-amber-600 dark:text-amber-500' : 'text-stone-400 group-hover:text-stone-600'}
      `}>
        {icon}
      </div>

      {expanded && (
        <div className="text-left flex-1 min-w-0">
          <span className={`block text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
            {label}
          </span>
        </div>
      )}
    </button>
  )
}
