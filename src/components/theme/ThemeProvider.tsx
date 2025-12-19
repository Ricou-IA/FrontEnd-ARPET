// ============================================================
// ARPET - Theme System (Provider + Toggle)
// Version: 1.0.0 - Quick Win: Dark/Light mode
// Date: 2025-12-17
// ============================================================

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Moon, Sun } from 'lucide-react'

// ============================================================
// TYPES
// ============================================================

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

// ============================================================
// CONTEXT
// ============================================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// ============================================================
// PROVIDER
// ============================================================

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({ 
  children, 
  defaultTheme = 'system',
  storageKey = 'arpet-theme'
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey) as Theme | null
      return stored || defaultTheme
    }
    return defaultTheme
  })

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // Résoudre le thème effectif
  useEffect(() => {
    const root = window.document.documentElement

    // Nettoyer les classes précédentes
    root.classList.remove('light', 'dark')

    let effectiveTheme: 'light' | 'dark'

    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light'
    } else {
      effectiveTheme = theme
    }

    root.classList.add(effectiveTheme)
    setResolvedTheme(effectiveTheme)
  }, [theme])

  // Écouter les changements de préférence système
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      const root = window.document.documentElement
      root.classList.remove('light', 'dark')
      const newTheme = e.matches ? 'dark' : 'light'
      root.classList.add(newTheme)
      setResolvedTheme(newTheme)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme)
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    const next = resolvedTheme === 'light' ? 'dark' : 'light'
    setTheme(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// ============================================================
// HOOK
// ============================================================

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// ============================================================
// TOGGLE COMPONENT
// ============================================================

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative p-2 rounded-lg transition-all duration-200
        hover:bg-stone-100 dark:hover:bg-stone-800
        text-stone-500 dark:text-stone-400
        hover:text-stone-700 dark:hover:text-stone-200
        ${showLabel ? 'flex items-center gap-2' : ''}
        ${className}
      `}
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
    >
      <div className="relative w-5 h-5">
        {/* Sun icon */}
        <Sun 
          className={`
            w-5 h-5 absolute inset-0 transition-all duration-300
            ${isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}
          `}
        />
        {/* Moon icon */}
        <Moon 
          className={`
            w-5 h-5 absolute inset-0 transition-all duration-300
            ${isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}
          `}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium">
          {isDark ? 'Mode clair' : 'Mode sombre'}
        </span>
      )}
    </button>
  )
}

export default ThemeProvider
