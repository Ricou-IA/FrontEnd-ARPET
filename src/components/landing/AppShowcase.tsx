// ============================================================
// ARPET - AppShowcase Component
// Version: 1.0.0 - Reproduction fidèle de l'interface réelle
// Date: 2025-12-18
// ============================================================

import { useState, useEffect } from 'react'
import { MessageSquare, FileText, Settings, Sparkles, Paperclip, Mic, Send, CheckCircle2, AlertTriangle, Archive } from 'lucide-react'

type ShowcaseScenario = 'analysis' | 'question' | 'cr' | 'search'

export function AppShowcase() {
  const [currentScenario, setCurrentScenario] = useState<ShowcaseScenario>('analysis')

  // Auto-play : changement de scénario toutes les 5 secondes
  useEffect(() => {
    const scenarios: ShowcaseScenario[] = ['analysis', 'question', 'cr', 'search']
    const interval = setInterval(() => {
      setCurrentScenario((prev) => {
        const currentIndex = scenarios.indexOf(prev)
        const nextIndex = (currentIndex + 1) % scenarios.length
        return scenarios[nextIndex]
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full max-w-6xl h-[650px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex overflow-hidden">
      {/* Sidebar (Gauche - Fixe) */}
      <aside className="w-20 border-r border-gray-100 flex flex-col items-center py-6 bg-zinc-50/90">
        {/* Logo en haut */}
        <div className="mb-8">
          <h1 className="font-serif text-xl font-bold text-[#0B0F17]">Arpet.</h1>
        </div>

        {/* Navigation au milieu */}
        <nav className="flex-1 flex flex-col gap-4">
          {/* MessageSquare - Active */}
          <div className="w-10 h-10 rounded-lg bg-[#0B0F17] flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          
          {/* FileText - Inactive */}
          <div className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition">
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
        </nav>

        {/* Settings en bas */}
        <div className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 transition">
          <Settings className="w-5 h-5 text-gray-400" />
        </div>
      </aside>

      {/* Zone Principale (Droite - Le Chat) */}
      <main className="flex-1 flex flex-col relative bg-white bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        {/* En-tête */}
        <header className="px-8 py-6 flex-shrink-0">
          <h2 className="font-serif text-3xl text-gray-900">Bonjour Eric,</h2>
        </header>

        {/* Zone de contenu (Carrousel) */}
        <div className="flex-1 overflow-hidden relative px-8 pb-4">
          {/* Scénario A : L'Analyse */}
          <div
            className={`absolute inset-0 px-8 transition-opacity duration-500 ${
              currentScenario === 'analysis' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="space-y-4">
              {/* Message système */}
              <div className="text-xs text-gray-500 mb-4">
                Document CCTP_Lot04.pdf analysé.
              </div>

              {/* DocumentCard */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm max-w-md">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✨</span>
                    <h3 className="font-serif text-sm font-semibold text-[#0B0F17]">
                      Analyse terminée
                    </h3>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-2.5 text-xs">
                  <div className="flex items-start gap-3">
                    <span className="text-gray-500 font-medium min-w-[50px] text-[11px]">Type :</span>
                    <span className="text-gray-900">Marché Privé</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-gray-500 font-medium min-w-[50px] text-[11px]">Lot :</span>
                    <span className="text-gray-900">Menuiseries Extérieures</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-gray-500 font-medium min-w-[50px] text-[11px]">⚠️ Vigilance :</span>
                    <span className="text-gray-900">Acoustique</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scénario B : La Précision */}
          <div
            className={`absolute inset-0 px-8 transition-opacity duration-500 ${
              currentScenario === 'question' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="space-y-4">
              {/* Question User (à droite) */}
              <div className="flex justify-end">
                <div className="bg-[#0B0F17] text-white rounded-lg px-3 py-2.5 max-w-[75%]">
                  <p className="text-xs leading-relaxed">Quelle est la tolérance de planéité ?</p>
                </div>
              </div>

              {/* Réponse Arpet (à gauche) */}
              <div className="flex justify-start">
                <div className="max-w-[75%]">
                  <p className="text-xs text-gray-900 leading-relaxed">
                    Selon le DTU 13.3, la tolérance est de{' '}
                    <span className="bg-yellow-100 px-1 rounded">5mm sous la règle de 2m</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Scénario C : Le CR 'Pro' (Génération automatique) */}
          <div
            className={`absolute inset-0 px-8 transition-opacity duration-500 ${
              currentScenario === 'cr' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="space-y-4">
              {/* Badge élégant - Réunion terminée */}
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-700 font-medium">Réunion de Chantier n°12 terminée - 45min</span>
                </div>
              </div>

              {/* Carte de Compte-Rendu Riche (Générée automatiquement) */}
              <div className="flex justify-start">
                <div className="flex flex-col items-start max-w-sm w-full bg-white border border-gray-200 rounded-xl shadow-sm">
                  {/* En-tête de succès */}
                  <div className="w-full px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-green-50/50">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Votre compte-rendu est prêt !
                    </h3>
                  </div>

                  {/* La Carte Document Principale */}
                  <div className="w-full">
                    {/* Header du Document */}
                    <div className="p-4 border-b border-gray-50 flex items-start gap-3 bg-gray-50/50">
                      <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                        <FileText className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 leading-tight">CR_Reunion_Chantier_12.pdf</h3>
                        <p className="text-xs text-gray-400 mt-1">Généré le 19 Oct • 2.4 MB</p>
                      </div>
                    </div>

                    {/* Aperçu du contenu (Points clés) */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span>Lot 03 : Ferraillages validés</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span>Lot 08 : Retard notifié (Carrelage)</span>
                      </div>
                    </div>

                    {/* Actions (Boutons) */}
                    <div className="p-3 bg-gray-50 flex gap-2 border-t border-gray-100">
                      <button className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white text-xs font-medium py-2 rounded-lg transition-colors">
                        <Send className="w-3 h-3" /> Diffuser
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium py-2 rounded-lg transition-colors">
                        <Archive className="w-3 h-3" /> Archiver
                      </button>
                    </div>
                  </div>

                  {/* Le Log Technique (Terminal Style) */}
                  <div className="w-full px-4 pb-3 pt-2">
                    <p className="font-mono text-xs text-gray-400">⚡ Généré en 5.36s</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scénario D : La Recherche Multi-documents */}
          <div
            className={`absolute inset-0 px-8 transition-opacity duration-500 ${
              currentScenario === 'search' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="space-y-4">
              {/* Question User (à droite) */}
              <div className="flex justify-end">
                <div className="bg-[#0B0F17] text-white rounded-lg px-3 py-2.5 max-w-[75%]">
                  <p className="text-xs leading-relaxed">Quels sont les CR qui parlent du FM19 ?</p>
                </div>
              </div>

              {/* Carte Résultats de recherche */}
              <div className="flex justify-start">
                <div className="flex flex-col items-start max-w-md w-full bg-white border border-gray-200 rounded-xl shadow-sm">
                  {/* En-tête */}
                  <div className="w-full px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">Résultats de recherche</h3>
                    <p className="text-xs text-gray-500 mt-1">4 documents trouvés</p>
                  </div>

                  {/* Liste des résultats */}
                  <div className="w-full p-4 space-y-3">
                    {/* Résultat 1 */}
                    <div className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition">
                      <FileText className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium text-gray-900 mb-1">CR n°08 - 12/09</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          ...mention du <span className="font-semibold text-gray-900">FM19</span> dans le lot 05...
                        </p>
                      </div>
                    </div>

                    {/* Résultat 2 */}
                    <div className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition">
                      <FileText className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium text-gray-900 mb-1">CR n°15 - 18/09</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Validation du <span className="font-semibold text-gray-900">FM19</span> par le maître d'œuvre...
                        </p>
                      </div>
                    </div>

                    {/* Résultat 3 */}
                    <div className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition">
                      <FileText className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium text-gray-900 mb-1">CR n°22 - 25/09</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Retard signalé sur le <span className="font-semibold text-gray-900">FM19</span>...
                        </p>
                      </div>
                    </div>

                    {/* Résultat 4 */}
                    <div className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition">
                      <FileText className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium text-gray-900 mb-1">CR n°31 - 02/10</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Réception du <span className="font-semibold text-gray-900">FM19</span> validée...
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bouton d'action */}
                  <div className="w-full px-4 pb-4">
                    <button className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white text-xs font-medium py-2.5 rounded-lg transition-colors">
                      <FileText className="w-3.5 h-3.5" />
                      Ouvrir les 4 documents
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barre d'Input (En bas - Statique) */}
        <div className="px-8 pb-6 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 flex items-center gap-2">
            {/* Icônes à gauche */}
            <div className="flex items-center gap-2">
              <button className="p-2 text-amber-500 hover:text-amber-600 rounded-lg transition">
                <Sparkles className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition">
                <Paperclip className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition">
                <Mic className="w-4 h-4" />
              </button>
            </div>

            {/* Input */}
            <input
              type="text"
              placeholder="De quoi avez-vous besoin ?..."
              className="flex-1 outline-none text-sm text-gray-900 placeholder-gray-400 bg-transparent"
              readOnly
            />

            {/* Bouton Envoyer à droite */}
            <button className="px-4 py-2 bg-[#0B0F17] text-white rounded-lg hover:bg-[#0B0F17]/90 transition text-xs font-medium flex items-center gap-1.5">
              <span>Envoyer</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

