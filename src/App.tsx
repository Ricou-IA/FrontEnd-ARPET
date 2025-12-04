// ============================================================
// ARPET - Main App Component with Routing
// Version: 2.0.0
// ============================================================

import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { getUserProjects } from './lib/supabase'
import { LoginPage, ForgotPasswordPage, ResetPasswordPage } from './components/auth'
import { Sidebar } from './components/layout/Sidebar'
import { MainContent } from './components/layout/MainContent'
import type { Project } from './types'

// ============================================================
// LOADING SCREEN
// ============================================================

function LoadingScreen() {
  return (
    <div className="h-screen bg-[#FAFAF9] flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-brand text-4xl text-gray-900 mb-4">Arpet.</h1>
        <div className="flex gap-1 justify-center">
          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
// MAIN DASHBOARD
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

// ============================================================
// APP COMPONENT
// ============================================================

function App() {
  return (
    <BrowserRouter>
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

        {/* ================================ */}
        {/* Redirect par défaut             */}
        {/* ================================ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
