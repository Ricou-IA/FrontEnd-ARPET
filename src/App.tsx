// ============================================================
// ARPET - Main App Component with Routing
// Version: 4.1.0 - Toggle RAG v2/v3
// Date: 2025-01-15
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { ThemeProvider } from './components/theme/ThemeProvider'
import { MarketingLayout } from './components/layouts/MarketingLayout'
import { AppLayout } from './components/layouts/AppLayout'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Documents } from './pages/Documents'
import { Settings } from './pages/Settings'
import { RagVersionToggle } from './components/RagVersionToggle'

// ============================================================
// LOADING SCREEN
// ============================================================

function LoadingScreen() {
  return (
    <div className="h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-serif text-4xl text-[#0B0F17] mb-4">Arpet.</h1>
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
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}

// ============================================================
// APP COMPONENT
// ============================================================

function App() {
  const { user } = useAuth()

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
          {/* Routes Marketing (publiques)    */}
          {/* ================================ */}
          <Route element={<MarketingLayout />}>
            <Route index element={<Landing />} />
            <Route
              path="login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
          </Route>

          {/* ================================ */}
          {/* Routes App (protégées)          */}
          {/* ================================ */}
          <Route
            path="app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="documents" element={<Documents />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* ================================ */}
          {/* Redirect par défaut             */}
          {/* ================================ */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* ================================ */}
        {/* Toggle RAG v2/v3 (dev/test)     */}
        {/* Visible uniquement si connecté  */}
        {/* ================================ */}
        {user && <RagVersionToggle showDetails />}
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
