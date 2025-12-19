// ============================================================
// ARPET - Landing Page
// Version: 2.0.0 - Hero + Sections complètes
// Date: 2025-12-18
// ============================================================

import { Link } from 'react-router-dom'
import { AlertCircle, Clock, Scale, Mic, FileText, ChevronDown, Search, Users } from 'lucide-react'
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
          SECTION B : LA PROMESSE
          ============================================================ */}
      <section className="pt-12 pb-20 px-4">
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
