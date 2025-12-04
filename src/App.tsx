import { useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { getUserProjects } from './lib/supabase'
import { LoginPage } from './components/auth/LoginPage'
import { Sidebar } from './components/layout/Sidebar'
import { MainContent } from './components/layout/MainContent'
import type { Project } from './types'

function App() {
  const { user, profile, isLoading: authLoading } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)

  // Charger les projets quand le profil est disponible
  useEffect(() => {
    async function loadProjects() {
      if (profile?.org_id) {
        setProjectsLoading(true)
        try {
          const data = await getUserProjects(profile.org_id)
          setProjects(data as Project[])
        } catch (error) {
          console.error('Error loading projects:', error)
        } finally {
          setProjectsLoading(false)
        }
      }
    }

    loadProjects()
  }, [profile?.org_id])

  // Écran de chargement
  if (authLoading) {
    return (
      <div className="h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-4xl text-stone-800 mb-4">Léa.</h1>
          <div className="flex gap-1 justify-center">
            <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    )
  }

  // Page de connexion si non authentifié
  if (!user) {
    return <LoginPage />
  }

  // Application principale
  return (
    <div className="h-screen flex overflow-hidden text-stone-800 bg-[#FAFAF9]">
      {/* Sidebar */}
      <Sidebar projects={projects} />

      {/* Contenu principal */}
      <MainContent />

      {/* Loading overlay pour les projets */}
      {projectsLoading && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <p className="text-sm text-stone-600">Chargement des chantiers...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
