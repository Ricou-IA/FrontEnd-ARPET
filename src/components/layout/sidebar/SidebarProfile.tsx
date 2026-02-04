// ============================================================
// ARPET - Sidebar Profile Section
// ============================================================

import { LogOut } from 'lucide-react'

interface SidebarProfileProps {
  expanded: boolean
  fullName?: string | null
  businessRole?: string | null
  onSignOut: () => void
}

export function SidebarProfile({ expanded, fullName, businessRole, onSignOut }: SidebarProfileProps) {
  return (
    <div className={`mt-auto ${expanded ? 'p-4' : 'p-3'}`}>
      <div className={`
        w-full flex items-center bg-white dark:bg-stone-800 border border-stone-200/50 dark:border-stone-700/50
        rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group
        ${expanded ? 'gap-3 px-3 py-3' : 'justify-center p-1.5 aspect-square'}
      `}>
        {/* Avatar */}
        <div className={`
          rounded-lg bg-gradient-to-br from-arpet-accent to-arpet-accent-light text-white
          flex items-center justify-center font-serif font-bold shadow-inner flex-shrink-0
          ${expanded ? 'w-9 h-9 text-sm' : 'w-8 h-8 text-xs'}
        `}>
          {fullName?.charAt(0) || 'U'}
        </div>

        {/* Infos utilisateur */}
        {expanded && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate leading-tight">
                {fullName || 'Utilisateur'}
              </p>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate font-medium">
                {businessRole || 'Membre'}
              </p>
            </div>

            <button
              onClick={onSignOut}
              className="p-1.5 text-stone-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
