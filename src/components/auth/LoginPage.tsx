import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { AuthBranding } from './AuthBranding'

export function LoginPage() {
  const { signIn } = useAuth()
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    // MODIFICATION ICI : Fond gris neutre (bg-gray-100), sans le quadrillage
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-100">
      
      {/* Carte Flottante */}
      <div className="relative w-full max-w-[1000px] h-[650px] bg-white rounded-[30px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] flex overflow-hidden ring-1 ring-black/5">
        
        {/* Colonne GAUCHE : Branding (Le quadrillage reste ICI uniquement) */}
        <AuthBranding />

        {/* Colonne DROITE : Formulaire */}
        <div className="w-full md:w-1/2 bg-white p-12 lg:p-16 flex flex-col justify-center relative">
          <div className="max-w-xs mx-auto w-full">
            
            <div className="mb-10">
              <h2 className="font-serif font-bold text-3xl text-[#0B0F17] mb-2">Bienvenue</h2>
              <p className="text-gray-500 text-sm">
                Veuillez vous identifier pour accéder à vos chantiers.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-[#0B0F17] transition-all outline-none"
                  placeholder="vous@entreprise.fr"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-[#0B0F17] transition-all outline-none pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <a href="/forgot-password" className="text-xs text-gray-500 hover:text-[#0B0F17] font-medium transition-colors">
                  Mot de passe oublié ?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#0B0F17] text-white rounded-xl hover:bg-black hover:shadow-lg transition-all font-medium text-sm mt-2"
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-400">
                © 2025 Arpet - Logiciel Métier
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
