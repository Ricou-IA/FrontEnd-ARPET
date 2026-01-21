// ============================================================
// ARPET - Landing Page
// Version: 2.2.0 - Hero + 3 Cartes Tarifs + Formulaire Pionnier
// Date: 2025-01-21
// ============================================================

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Clock, Scale, Mic, FileText, ChevronDown, Search, Users, Loader2, CheckCircle } from 'lucide-react'
import { HeroBranding } from '../components/auth/HeroBranding'
import { AppShowcase } from '../components/landing/AppShowcase'

export function Landing() {
  // State pour le formulaire Pionnier
  const [formData, setFormData] = useState({
    email: '',
    prenom: '',
    societe: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Fonction de scroll smooth vers la section promesse
  const scrollToPromesse = () => {
    const element = document.getElementById('promesse')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Soumission du formulaire Pionnier
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('https://n8n.srv1102213.hstgr.cloud/webhook/gmail-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_email',
          params: {
            to: 'contact@arpet.ai',
            subject: `🚀 Nouveau Pionnier ARPET : ${formData.prenom}`,
            body: `Nouvelle inscription Pionnier ARPET !\n\n` +
                  `📧 Email : ${formData.email}\n` +
                  `👤 Prénom : ${formData.prenom}\n` +
                  `🏢 Société : ${formData.societe || 'Non renseignée'}\n\n` +
                  `---\n` +
                  `Inscription reçue le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`
          }
        })
      })

      if (response.ok) {
        setIsSubmitted(true)
        setFormData({ email: '', prenom: '', societe: '' })
      } else {
        throw new Error('Erreur lors de l\'envoi')
      }
    } catch (err) {
      setError('Une erreur est survenue. Réessayez ou contactez-nous directement.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] relative">
      {/* Masque radial plus subtil : grille visible plus rapidement sur les bords */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,white_10%,transparent_60%)] pointer-events-none"></div>
      
      {/* Contenu */}
      <div className="relative z-10">
      {/* ============================================================
          HERO SECTION
          ============================================================ */}
      <section className="min-h-screen flex items-center justify-center px-4 py-20 relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo et Fil à Plomb - Version Hero */}
          <HeroBranding />
          
          {/* Grand titre */}
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-[#0B0F17] mb-8 leading-tight">
            Il cherche les réponses,
            <br />
            <span className="font-normal">vous prenez les décisions.</span>
          </h1>

          <p className="text-2xl text-gray-600 font-medium mb-12 max-w-2xl mx-auto text-center">
            Ne stockez plus vos données, exploitez-les.
          </p>

          <div className="flex gap-4 justify-center mb-16">
            <button
              onClick={scrollToPromesse}
              className="px-8 py-3 bg-[#0B0F17] text-white rounded-lg hover:bg-[#0B0F17]/90 transition-colors font-medium"
            >
              Découvrir
            </button>
            <Link
              to="/login"
              className="px-8 py-3 bg-white text-[#0B0F17] border border-gray-200 rounded-lg hover:bg-[#F9FAFB] transition-colors font-medium"
            >
              Se connecter
            </Link>
          </div>
        </div>

        {/* Indicateur de scroll */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <ChevronDown className="w-6 h-6 text-gray-400 animate-bounce" />
        </div>
      </section>

      {/* ============================================================
          SECTION B : LA PROMESSE
          ============================================================ */}
      <section id="promesse" className="pt-12 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Colonne gauche : Texte */}
            <div>
              <h2 className="font-serif text-4xl md:text-5xl text-[#0B0F17] mb-6 leading-tight">
                Le chantier se gagne sur le terrain, pas derrière un écran.
              </h2>
              
              <p className="text-lg text-gray-600 mb-10 leading-relaxed">
                Libérez-vous des tâches administratives chronophages. Retrouvez vos équipes et la réalité du chantier.
              </p>
              
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Charge mentale allégée</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Déléguez la rédaction et la synthèse. Conservez votre énergie mentale pour la prise de décision et le management.
                    </p>
                  </div>
                </li>
                
                <li className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <Clock className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Temps utile retrouvé</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Ne subissez plus l'administratif. Transformez les heures de bureau passives en présence active sur vos opérations.
                    </p>
                  </div>
                </li>
                
                <li className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <Scale className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Sources fiables et maîtrisées</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Les règles de l'art, à portée de clic. Vos écrits et analyses s'appuient instantanément sur votre base documentaire et les normes en vigueur.
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Colonne droite : Showcase de l'application */}
            <AppShowcase />
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION C : LA CAISSE À OUTILS (Bento Grid 2x2)
          ============================================================ */}
      <section className="py-20 px-4 relative bg-white bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl text-[#0B0F17] mb-4">
              Votre caisse à outils pour piloter vos opérations.
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Une suite complète pour piloter vos opérations, du terrain au bureau, seul ou en équipe.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Carte 1 : Générateur de Rapports (Haut Gauche) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-shadow">
              {/* En-tête horizontal : Icône + Titre */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-sans text-xl font-bold text-gray-900">
                  Générateur de Rapports
                </h3>
              </div>
              <p className="text-gray-600 text-base leading-relaxed">
                Comptes-rendus, courriers... Transformez vos notes ou votre voix en documents pro instantanément.
              </p>
            </div>

            {/* Carte 2 : Moteur de Recherche (Haut Droite) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-shadow">
              {/* En-tête horizontal : Icône + Titre */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Search className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="font-sans text-xl font-bold text-gray-900">
                  Moteur de Recherche
                </h3>
              </div>
              <p className="text-gray-600 text-base leading-relaxed">
                CCTP, DTU, Devis... Une question ? Arpet scanne toute votre base documentaire.
              </p>
            </div>

            {/* Carte 3 : Capture Terrain (Bas Gauche) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-shadow">
              {/* En-tête horizontal : Icône + Titre */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 relative">
                  <Mic className="w-6 h-6 text-green-600 z-10" />
                  {/* Onde sonore abstraite */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-green-200 rounded-full opacity-50"></div>
                  </div>
                </div>
                <h3 className="font-sans text-xl font-bold text-gray-900">
                  Capture Terrain
                </h3>
              </div>
              <p className="text-gray-600 text-base leading-relaxed">
                Dictée vocale, photos... Ne perdez plus aucune information captée sur le vif.
              </p>
            </div>

            {/* Carte 4 : Travail Collaboratif (Bas Droite) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-shadow">
              {/* En-tête horizontal : Icône + Titre */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-sans text-xl font-bold text-gray-900">
                  Travail Collaboratif
                </h3>
              </div>
              <p className="text-gray-600 text-base leading-relaxed">
                Partagez la connaissance. Unifiez les bases et collaborez sur les dossiers en temps réel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION D : TARIFS (3 Pricing Cards)
          ============================================================ */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-4xl md:text-5xl text-[#0B0F17] text-center mb-16">
            Un tarif simple.
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Carte 1 : DÉCOUVERTE */}
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="mb-6">
                <h3 className="font-serif text-2xl text-[#0B0F17] mb-2">DÉCOUVERTE</h3>
                <div className="mb-4">
                  <span className="font-serif text-4xl text-[#0B0F17]">0€</span>
                  <span className="text-gray-500 text-sm">/mois</span>
                </div>
                <p className="text-gray-600 text-sm mb-6">
                  Fonctions limitées, pas de CR automatique.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Accès aux normes (lecture seule)</li>
                  <li>• Dictée limitée (10 min/mois)</li>
                  <li>• Support communautaire</li>
                </ul>
              </div>
            </div>

            {/* Carte 2 : PRO SOLO */}
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="mb-6">
                <h3 className="font-serif text-2xl text-[#0B0F17] mb-2">PRO SOLO</h3>
                <div className="mb-4">
                  <span className="font-serif text-4xl text-[#0B0F17]">59€</span>
                  <span className="text-gray-500 text-sm"> HT / mois</span>
                </div>
                <p className="text-gray-600 text-sm mb-6">
                  Rentabilisé au 1er CR. Accès complet à toutes les fonctionnalités.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• CR automatique illimité</li>
                  <li>• Accès DTU/Normes complet</li>
                  <li>• Dictée illimitée</li>
                  <li>• Support prioritaire</li>
                </ul>
              </div>
            </div>

            {/* Carte 3 : PIONNIER (Mise en avant avec formulaire) */}
            <div className="bg-white border-2 border-[#0B0F17] rounded-lg p-8 relative">
              <div className="absolute top-4 right-4">
                <span className="bg-[#0B0F17] text-white text-xs px-3 py-1 rounded-full">
                  PIONNIER
                </span>
              </div>
              
              <div>
                <h3 className="font-serif text-2xl text-[#0B0F17] mb-2">PIONNIER</h3>
                <div className="mb-4">
                  <span className="font-serif text-4xl text-[#0B0F17]">Gratuit</span>
                </div>
                <p className="text-gray-600 text-sm mb-6">
                  Accès PRO complet offert. Façonnez le produit avec nous.
                </p>

                {isSubmitted ? (
                  <div className="text-center py-6">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <p className="text-gray-900 font-medium mb-2">Bienvenue parmi les Pionniers !</p>
                    <p className="text-gray-600 text-sm">Nous vous contacterons très vite.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <input
                        type="email"
                        placeholder="Email *"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B0F17] focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Prénom *"
                        required
                        value={formData.prenom}
                        onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B0F17] focus:border-transparent outline-none text-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Société (optionnel)"
                        value={formData.societe}
                        onChange={(e) => setFormData({ ...formData, societe: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B0F17] focus:border-transparent outline-none text-sm"
                      />
                    </div>

                    {error && (
                      <p className="text-red-600 text-sm">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-[#0B0F17] text-white rounded-lg hover:bg-[#0B0F17]/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        'Rejoindre les Pionniers'
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  )
}
