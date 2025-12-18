// ============================================================
// ARPET - Main App Component with Routing
// Version: 3.1.0 - Intégration Split View Panel
// Date: 2025-12-18
// ============================================================

import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { getUserProjects } from './lib/supabase'
import { LoginPage, ForgotPasswordPage, ResetPasswordPage } from './components/auth'
import { Sidebar } from './components/layout/Sidebar'
import { MainContent } from './components/layout/MainContent'
import { DocumentsPage } from './components/documents'
import { SplitViewPanel } from './components/viewer'
import { ThemeProvider } from './components/theme/ThemeProvider'
import { useAppStore } from './stores/appStore'
import type { Project } from './types'

// ============================================================
// LOADING SCREEN
// ============================================================

function LoadingScreen() {
  return (
    <div className="h-screen bg-[#FAFAF9] dark:bg-stone-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-brand text-4xl text-gray-900 dark:text-gray-100 mb-4">Arpet.</h1>
        <div className="flex gap-1 justify-center">
          <span className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// PROTECTED ROUTE WRAPPER
// ============================================================

interface ProtectedRouteProps {
  children: React.ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// ============================================================
// PUBLIC ROUTE WRAPPER (redirect if already logged in)
// ============================================================

interface PublicRouteProps {
  children: React.ReactNode
}

function PublicRoute({ children }: PublicRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

// ============================================================
// DASHBOARD LAYOUT (avec Sidebar + Split View)
// ============================================================

interface DashboardLayoutProps {
  children: React.ReactNode
  projects: Project[]
  projectsLoading: boolean
}

function DashboardLayout({ children, projects, projectsLoading }: DashboardLayoutProps) {
  const { viewerOpen } = useAppStore()

  return (
    <div className="h-screen flex overflow-hidden text-stone-800 dark:text-stone-200 bg-[#FAFAF9] dark:bg-stone-950">
      {/* Sidebar */}
      <Sidebar projects={projects} />

      {/* Contenu principal - se réduit quand le viewer est ouvert */}
      <div className={`flex-1 flex overflow-hidden transition-all duration-300 ${viewerOpen ? 'mr-0' : ''}`}>
        {/* Zone principale */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>

        {/* Split View Panel */}
        {viewerOpen && <SplitViewPanel />}
      </div>

      {/* Loading overlay pour les projets */}
      {projectsLoading && (
        <div className="fixed inset-0 bg-black/10 dark:bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-stone-900 rounded-lg p-4 shadow-lg">
            <p className="text-sm text-stone-600 dark:text-stone-400">Chargement des chantiers...</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// MAIN DASHBOARD (Chat)
// ============================================================

function Dashboard() {
  const { profile } = useAuth()
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

  return (
    <DashboardLayout projects={projects} projectsLoading={projectsLoading}>
      <MainContent />
    </DashboardLayout>
  )
}

// ============================================================
// DOCUMENTS PAGE
// ============================================================

function DocumentsPageWrapper() {
  const { profile } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)

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

  return (
    <DashboardLayout projects={projects} projectsLoading={projectsLoading}>
      <DocumentsPage />
    </DashboardLayout>
  )
}

// ============================================================
// APP COMPONENT
// ============================================================

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {/* ================================ */}
          {/* Routes publiques (auth)         */}
          {/* ================================ */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />
          {/* Reset password : accessible même connecté (flow Supabase) */}
          <Route
            path="/reset-password"
            element={<ResetPasswordPage />}
          />

          {/* ================================ */}
          {/* Routes protégées (app)          */}
          {/* ================================ */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <DocumentsPageWrapper />
              </ProtectedRoute>
            }
          />

          {/* ================================ */}
          {/* Redirect par défaut             */}
          {/* ================================ */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
