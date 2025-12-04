// ============================================================
// ARPET - Forgot Password Page (Refactorisé)
// Version: 1.2.0 - Utilise AuthBranding
// ============================================================

import { useState } from 'react'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { AuthBranding } from './AuthBranding'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error
      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-100 login-bg-pattern">
      {/* Split Card Container */}
      <div className="bg-white rounded-2xl shadow-2xl shadow-gray-200/50 w-full max-w-5xl flex flex-col md:flex-row min-h-[600px] overflow-hidden">
        
        {/* Partie GAUCHE : Branding (factorisé) */}
        <AuthBranding />

        {/* Partie DROITE : Formulaire */}
        <div className="w-full md:w-7/12 bg-white p-12 lg:p-16 flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full">
            {/* Bouton retour */}
            <a href="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition mb-8">
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </a>

            {isSuccess ? (
              /* État de succès */
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="font-brand-bold text-3xl text-gray-900 mb-4">Email envoyé !</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Si un compte existe avec l'adresse <strong className="text-gray-900">{email}</strong>, 
                  vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
                </p>
                <p className="text-gray-400 text-xs">
                  Pensez à vérifier vos spams si vous ne recevez rien dans les prochaines minutes.
                </p>
              </div>
            ) : (
              /* Formulaire */
              <>
                {/* Header */}
                <div className="mb-10">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Mail className="w-6 h-6 text-gray-600" />
                  </div>
                  <h2 className="font-brand-bold text-3xl text-gray-900 mb-2">Mot de passe oublié ?</h2>
                  <p className="text-gray-500 text-sm">
                    Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                  </p>
                </div>

                {/* Message d'erreur */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

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
                      autoFocus
                    />
                  </div>

                  {/* Bouton d'envoi */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-black transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Envoi en cours...
                      </span>
                    ) : (
                      'Envoyer le lien de réinitialisation'
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
