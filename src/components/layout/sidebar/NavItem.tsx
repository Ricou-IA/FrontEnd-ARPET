// ============================================================
// ARPET - NavItem Component
// ============================================================

interface NavItemProps {
  icon: React.ReactNode
  label: string
  isActive: boolean
  expanded: boolean
  onClick: () => void
  variant?: 'default' | 'amber'
}

export function NavItem({ icon, label, isActive, expanded, onClick, variant = 'default' }: NavItemProps) {
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
