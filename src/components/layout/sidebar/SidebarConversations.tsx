// ============================================================
// ARPET - Sidebar Conversations Section
// ============================================================

import { MessageSquare, Trash2, Plus } from 'lucide-react'
import type { SavedConversation } from '../../../types'

interface SidebarConversationsProps {
  expanded: boolean
  conversations: SavedConversation[]
  loading: boolean
  onLoadConversation: (conversation: SavedConversation) => void
  onDeleteConversation: (conversation: SavedConversation) => void
  onNewConversation: () => void
}

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return `Il y a ${diffDays} jours`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export function SidebarConversations({
  expanded,
  conversations,
  loading,
  onLoadConversation,
  onDeleteConversation,
  onNewConversation,
}: SidebarConversationsProps) {
  return (
    <div>
      {expanded && (
        <div className="flex items-center justify-between mb-3 px-2">
          <h3 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
            Discussions
          </h3>
          <button
            onClick={onNewConversation}
            className="p-1 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors rounded hover:bg-stone-200/50 dark:hover:bg-stone-800/50"
            title="Nouvelle discussion"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="space-y-1">
        {loading ? (
          expanded && (
            <div className="flex items-center justify-center py-4 opacity-50">
              <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
            </div>
          )
        ) : conversations.length === 0 ? (
          expanded && (
            <div className="px-2 py-4 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-lg">
              <p className="text-xs text-stone-400 dark:text-stone-500 italic">
                Aucune discussion
              </p>
            </div>
          )
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className="group/conv relative"
            >
              <button
                onClick={() => onLoadConversation(conversation)}
                title={!expanded ? conversation.title : undefined}
                className={`
                  w-full flex items-center rounded-lg transition-all duration-200
                  ${expanded ? 'gap-3 px-3 py-2.5 text-left' : 'justify-center p-2.5'}
                  hover:bg-white dark:hover:bg-stone-800 hover:shadow-sm
                  text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200
                `}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0 text-stone-400 dark:text-stone-600" />

                {expanded && (
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
              {expanded && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteConversation(conversation)
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
  )
}
