// ============================================================
// ARPET - Login Page
// Version: 4.1.0 - Intégration correcte de AuthBranding
// Date: 2025-12-18
// ============================================================

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
// MODIFICATION : On n'importe plus PlumbBob ici, mais AuthBranding
import { AuthBranding } from '../components/auth/AuthBranding'

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await signIn(email, password)
      navigate('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    // Fond Gris neutre pour la page
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 px-4 py-8">
      
      {/* Carte Flottante */}
      <div className="relative w-full max-w-[1000px] min-h-[600px] bg-white rounded-[30px] shadow-xl flex overflow-hidden">
        
        {/* COLONNE GAUCHE : On utilise le composant dédié */}
        {/* C'est lui qui contient le quadrillage, le logo et le fil à plomb aligné */}
        <AuthBranding />

        {/* COLONNE DROITE : Formulaire (50%) */}
        <div className="w-full md:w-1/2 bg-white flex items-center justify-center px-12 py-16 relative">
          <div className="w-full max-w-sm">
            
            {/* Header */}
            <div className="mb-10">
              <h2 className="font-serif text-3xl text-[#0B0F17] mb-2">Bienvenue</h2>
              <p className="text-gray-500 text-sm">
                Veuillez vous identifier pour accéder à vos chantiers.
              </p>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition text-gray-900 placeholder-gray-400"
                  placeholder="vous@entreprise.fr"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Mot de passe */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition text-gray-900 placeholder-gray-400 pr-12"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Lien mot de passe oublié */}
              <div className="flex justify-end">
                <a href="/forgot-password" className="text-sm text-gray-500 hover:text-[#0B0F17] transition">
                  Mot de passe oublié ?
                </a>
              </div>

              {/* Bouton de connexion */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#0B0F17] text-white rounded-lg hover:bg-[#0B0F17]/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connexion...
                  </span>
                ) : (
                  'Se connecter'
                )}
              </button>

              {/* Message d'erreur */}
              {error && (
                <div className="mt-2 text-sm text-red-600 text-center bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="mt-10 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                Pas encore de compte ?{' '}
                <a href="mailto:contact@arpet.fr" className="text-[#0B0F17] font-medium hover:underline">
                  Contactez votre administrateur
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
