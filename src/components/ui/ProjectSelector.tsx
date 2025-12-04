import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import type { Project } from '../../types'

interface ProjectSelectorProps {
  projects: Project[]
  collapsed?: boolean
}

export function ProjectSelector({ projects, collapsed = false }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const { activeProject, setActiveProject } = useAppStore()

  // Sélectionner le premier projet par défaut
  useEffect(() => {
    if (projects.length > 0 && !activeProject) {
      setActiveProject(projects[0])
    }
  }, [projects, activeProject, setActiveProject])

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  const handleSelectProject = (project: Project) => {
    setActiveProject(project)
    setIsOpen(false)
  }

  // Version réduite (sidebar collapsed)
  if (collapsed) {
    return (
      <div className="flex justify-center w-full">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-lg bg-stone-200/50 hover:bg-stone-200 flex items-center justify-center text-stone-800 font-bold transition"
        >
          {activeProject ? getInitials(activeProject.name) : '?'}
        </button>
      </div>
    )
  }

  // Version étendue
  return (
    <div ref={dropdownRef} className="relative w-full">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-stone-200/50 hover:bg-stone-200 text-stone-800 px-3 py-2 rounded-lg transition group"
      >
        <div className="flex items-center gap-2 truncate">
          <div className="w-5 h-5 rounded-full bg-stone-800 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {activeProject ? getInitials(activeProject.name) : '?'}
          </div>
          <span className="font-medium text-sm truncate">
            {activeProject?.name || 'Sélectionner un chantier'}
          </span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-stone-400 group-hover:text-stone-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
          {projects.length === 0 ? (
            <div className="px-3 py-2 text-sm text-stone-400">
              Aucun chantier disponible
            </div>
          ) : (
            projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelectProject(project)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-stone-50 transition ${
                  activeProject?.id === project.id ? 'bg-stone-100' : ''
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-stone-800 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {getInitials(project.name)}
                </div>
                <span className="text-sm text-stone-700 truncate">{project.name}</span>
                {activeProject?.id === project.id && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-green-500" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
