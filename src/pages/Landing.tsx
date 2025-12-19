// ============================================================
// ARPET - Landing Page
// Version: 2.0.0 - Hero + Sections complètes
// Date: 2025-12-18
// ============================================================

import { Link } from 'react-router-dom'
import { AlertCircle, Clock, Scale, Mic, FileText, Shield, ChevronDown } from 'lucide-react'
import { HeroBranding } from '../components/auth/HeroBranding'
import { AppShowcase } from '../components/landing/AppShowcase'
export function Landing() {
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
            <Link
              to="/app"
              className="px-8 py-3 bg-[#0B0F17] text-white rounded-lg hover:bg-[#0B0F17]/90 transition-colors font-medium"
            >
              Commencer
            </Link>
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
          SECTION B : LE PROBLÈME
          ============================================================ */}
      <section className="pt-12 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Colonne gauche : Texte */}
            <div>
              <h2 className="font-serif text-4xl md:text-5xl text-[#0B0F17] mb-8 leading-tight">
                Vous n'avez pas fait 5 ans d'études pour faire de la mise en page le dimanche.
              </h2>
              
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Charge mentale</h3>
                    <p className="text-gray-600 text-sm">
                      Rédaction de CR, vérification de normes, gestion documentaire... Le temps s'accumule.
                    </p>
                  </div>
                </li>
                
                <li className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <Clock className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Temps perdu</h3>
                    <p className="text-gray-600 text-sm">
                      Des heures passées sur des tâches administratives au lieu de gérer vos chantiers.
                    </p>
                  </div>
                </li>
                
                <li className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <Scale className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Risque juridique</h3>
                    <p className="text-gray-600 text-sm">
                      Erreurs de conformité, oublis de normes... Les conséquences peuvent être lourdes.
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
          SECTION C : LES FONCTIONNALITÉS (Bento Grid)
          ============================================================ */}
      <section className="py-20 px-4 bg-zinc-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-4xl md:text-5xl text-[#0B0F17] text-center mb-16">
            3 Outils. Une seule interface.
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Carte 1 : CR Automatique */}
            <div className="bg-white border border-gray-200 rounded-lg p-8 hover:shadow-lg transition-shadow">
              <div className="mb-6">
                <Mic className="w-10 h-10 text-[#0B0F17] mb-4" />
                <h3 className="font-serif text-2xl text-[#0B0F17] mb-3">
                  CR Automatique
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Vous parlez, il rédige. Transformez vos notes vocales en comptes-rendus professionnels en quelques secondes.
                </p>
              </div>
            </div>

            {/* Carte 2 : Expert Technique/RAG */}
            <div className="bg-white border border-gray-200 rounded-lg p-8 hover:shadow-lg transition-shadow">
              <div className="mb-6">
                <Shield className="w-10 h-10 text-[#0B0F17] mb-4" />
                <h3 className="font-serif text-2xl text-[#0B0F17] mb-3">
                  Expert Technique
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Vos plans + Les Normes. Accédez instantanément aux DTU, normes NF et réglementations depuis vos documents.
                </p>
              </div>
            </div>

            {/* Carte 3 : Dictée Terrain */}
            <div className="bg-white border border-gray-200 rounded-lg p-8 hover:shadow-lg transition-shadow">
              <div className="mb-6">
                <FileText className="w-10 h-10 text-[#0B0F17] mb-4" />
                <h3 className="font-serif text-2xl text-[#0B0F17] mb-3">
                  Dictée Terrain
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Notez vos observations directement sur le chantier. Transcription instantanée, même dans le bruit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION D : TARIFS (Pricing Cards)
          ============================================================ */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-4xl md:text-5xl text-[#0B0F17] text-center mb-16">
            Un tarif simple.
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
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

            {/* Carte 2 : PRO SOLO (Mise en avant) */}
            <div className="bg-white border-2 border-[#0B0F17] rounded-lg p-8 relative">
              <div className="absolute top-4 right-4">
                <span className="bg-[#0B0F17] text-white text-xs px-3 py-1 rounded-full">
                  POPULAIRE
                </span>
              </div>
              
              <div className="mb-6">
                <h3 className="font-serif text-2xl text-[#0B0F17] mb-2">PRO SOLO</h3>
                <div className="mb-4">
                  <span className="font-serif text-4xl text-[#0B0F17]">59€</span>
                  <span className="text-gray-500 text-sm"> HT / mois</span>
                </div>
                <p className="text-gray-600 text-sm mb-6">
                  Rentabilisé au 1er CR. Accès complet à toutes les fonctionnalités.
                </p>
                <ul className="space-y-2 text-sm text-gray-600 mb-8">
                  <li>• CR automatique illimité</li>
                  <li>• Accès DTU/Normes complet</li>
                  <li>• Dictée illimitée</li>
                  <li>• Support prioritaire</li>
                </ul>
                
                <Link
                  to="/login"
                  className="block w-full py-3 bg-[#0B0F17] text-white rounded-lg hover:bg-[#0B0F17]/90 transition-colors font-medium text-center"
                >
                  Essai Gratuit 7 jours
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  )
}
