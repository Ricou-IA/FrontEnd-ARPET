// ============================================================
// ARPET - Sidebar Navigation Section
// ============================================================

import { MessageSquare, FolderOpen, HardDrive, Video } from 'lucide-react'
import { NavItem } from './NavItem'

interface SidebarNavigationProps {
  expanded: boolean
  activeRoute: string
  onNavigate: (path: string) => void
  onOpenConnectors: () => void
  onOpenMeeting: () => void
}

const routes = {
  chat: '/app',
  documents: '/app/documents',
}

export function SidebarNavigation({ expanded, activeRoute, onNavigate, onOpenConnectors, onOpenMeeting }: SidebarNavigationProps) {
  const isActive = (path: string) => activeRoute === path

  return (
    <div className="space-y-1">
      {expanded && (
        <h3 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-3 px-2">
          Menu
        </h3>
      )}

      <NavItem
        icon={<MessageSquare className="w-[18px] h-[18px]" />}
        label="Chat"
        isActive={isActive(routes.chat)}
        expanded={expanded}
        onClick={() => onNavigate(routes.chat)}
      />

      <NavItem
        icon={<FolderOpen className="w-[18px] h-[18px]" />}
        label="Savoir"
        isActive={isActive(routes.documents)}
        expanded={expanded}
        onClick={() => onNavigate(routes.documents)}
      />

      <NavItem
        icon={<HardDrive className="w-[18px] h-[18px]" />}
        label="Connecteurs"
        isActive={false}
        expanded={expanded}
        onClick={onOpenConnectors}
      />

      <NavItem
        icon={<Video className="w-[18px] h-[18px]" />}
        label="Réunion"
        isActive={false}
        expanded={expanded}
        onClick={onOpenMeeting}
        variant="amber"
      />
    </div>
  )
}
