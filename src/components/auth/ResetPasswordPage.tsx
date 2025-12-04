// ============================================================
// ARPET - Reset Password Page
// Version: 1.0.0
// ============================================================

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { PlumbBob } from './PlumbBob'

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)

  // Vérifier si le token est présent dans l'URL (Supabase le gère via hash)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      // Vérifier si on est dans un flow de récupération de mot de passe
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const type = hashParams.get('type')
      
      if (type === 'recovery' || session) {
        setIsValidToken(true)
      } else {
        setIsValidToken(false)
      }
    }

    checkSession()

    // Écouter les changements d'auth (pour le flow recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidToken(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Validation du mot de passe
  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = []
    if (pwd.length < 8) errors.push('Au moins 8 caractères')
    if (!/[A-Z]/.test(pwd)) errors.push('Au moins une majuscule')
    if (!/[a-z]/.test(pwd)) errors.push('Au moins une minuscule')
    if (!/[0-9]/.test(pwd)) errors.push('Au moins un chiffre')
    return errors
  }

  const passwordErrors = validatePassword(password)
  const isPasswordValid = password.length > 0 && passwordErrors.length === 0
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isPasswordValid) {
      setError('Le mot de passe ne respecte pas les critères de sécurité')
      return
    }

    if (!doPasswordsMatch) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) throw error
      setIsSuccess(true)

      // Rediriger vers la page de connexion après 3 secondes
      setTimeout(() => {
        window.location.href = '/login'
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  // État de chargement initial
  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
          <p className="text-gray-500">Vérification en cours...</p>
        </div>
      </div>
    )
  }

  // Token invalide ou expiré
  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-100 login-bg-pattern">
        <div className="bg-white rounded-2xl shadow-2xl shadow-gray-200/50 p-12 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="font-brand text-2xl text-gray-900 mb-4">Lien invalide ou expiré</h2>
          <p className="text-gray-500 text-sm mb-6">
            Ce lien de réinitialisation n'est plus valide. Veuillez faire une nouvelle demande.
          </p>
          <a
            href="/forgot-password"
            className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-black transition font-medium"
          >
            Nouvelle demande
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-100 login-bg-pattern">
      {/* Split Card Container */}
      <div className="bg-white rounded-2xl shadow-2xl shadow-gray-200/50 w-full max-w-5xl flex flex-col md:flex-row min-h-[600px] overflow-hidden">
        
        {/* ========================================= */}
        {/* Partie GAUCHE : Branding                 */}
        {/* ========================================= */}
        <div className="w-full md:w-5/12 p-12 flex flex-col justify-center items-center relative text-center bg-gray-50 border-r border-gray-100 overflow-hidden">
          {/* Motif subtil de fond */}
          <div 
            className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.02]"
            style={{
              backgroundImage: 'radial-gradient(#1F2937 1px, transparent 1px)',
              backgroundSize: '16px 16px'
            }}
          />
          
          {/* Logo + Fil à plomb */}
          <div className="relative z-10 mb-8">
            <h1 className="font-brand text-6xl text-gray-900 font-medium tracking-tight relative inline-block">
              Arpet
              <span className="relative inline-block">
                .
                <PlumbBob />
              </span>
            </h1>
          </div>

          {/* Tagline */}
          <blockquote className="max-w-xs mx-auto z-10 relative mt-16">
            <p className="font-brand text-2xl text-gray-800 leading-snug">
              "Il cherche les réponses,
              <br />
              <span className="font-semibold text-black">vous prenez les décisions."</span>
            </p>
          </blockquote>
        </div>

        {/* ========================================= */}
        {/* Partie DROITE : Formulaire               */}
        {/* ========================================= */}
        <div className="w-full md:w-7/12 bg-white p-12 lg:p-16 flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full">
            {isSuccess ? (
              /* État de succès */
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="font-brand text-3xl text-gray-900 mb-4">
                  Mot de passe modifié !
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  Votre mot de passe a été réinitialisé avec succès. 
                  Vous allez être redirigé vers la page de connexion...
                </p>
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                </div>
              </div>
            ) : (
              /* Formulaire */
              <>
                {/* Header */}
                <div className="mb-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6 text-gray-600" />
                  </div>
                  <h2 className="font-brand text-3xl text-gray-900 mb-2">
                    Nouveau mot de passe
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Choisissez un nouveau mot de passe sécurisé pour votre compte.
                  </p>
                </div>

                {/* Message d'erreur */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Nouveau mot de passe */}
                  <div>
                    <label 
                      htmlFor="password" 
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Nouveau mot de passe
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
                        autoComplete="new-password"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    
                    {/* Critères de validation */}
                    {password.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <PasswordCriteria 
                          met={password.length >= 8} 
                          text="Au moins 8 caractères" 
                        />
                        <PasswordCriteria 
                          met={/[A-Z]/.test(password)} 
                          text="Au moins une majuscule" 
                        />
                        <PasswordCriteria 
                          met={/[a-z]/.test(password)} 
                          text="Au moins une minuscule" 
                        />
                        <PasswordCriteria 
                          met={/[0-9]/.test(password)} 
                          text="Au moins un chiffre" 
                        />
                      </div>
                    )}
                  </div>

                  {/* Confirmation mot de passe */}
                  <div>
                    <label 
                      htmlFor="confirmPassword" 
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition text-gray-900 placeholder-gray-400 pr-12 ${
                          confirmPassword.length > 0
                            ? doPasswordsMatch
                              ? 'border-green-300 focus:border-green-400 focus:ring-green-100'
                              : 'border-red-300 focus:border-red-400 focus:ring-red-100'
                            : 'border-gray-200 focus:border-gray-400 focus:ring-gray-100'
                        }`}
                        placeholder="••••••••"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {confirmPassword.length > 0 && !doPasswordsMatch && (
                      <p className="mt-2 text-sm text-red-500">
                        Les mots de passe ne correspondent pas
                      </p>
                    )}
                  </div>

                  {/* Bouton de validation */}
                  <button
                    type="submit"
                    disabled={isLoading || !isPasswordValid || !doPasswordsMatch}
                    className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-black transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle 
                            className="opacity-25" 
                            cx="12" cy="12" r="10" 
                            stroke="currentColor" 
                            strokeWidth="4"
                            fill="none"
                          />
                          <path 
                            className="opacity-75" 
                            fill="currentColor" 
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Modification en cours...
                      </span>
                    ) : (
                      'Réinitialiser le mot de passe'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <p className="absolute bottom-4 text-center text-xs text-gray-400">
        © 2025 Arpet - Tous droits réservés
      </p>
    </div>
  )
}

// ============================================================
// Composant pour afficher les critères de validation
// ============================================================

function PasswordCriteria({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}>
      {met ? (
        <CheckCircle className="w-3.5 h-3.5" />
      ) : (
        <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
      )}
      {text}
    </div>
  )
}
