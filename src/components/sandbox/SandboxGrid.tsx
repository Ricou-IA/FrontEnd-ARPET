// ============================================================
// ARPET - SandboxGrid Component
// Version: 3.0.0 - Direct Zustand store usage
// Date: 2025-12-04
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/stores/appStore'
import { SandboxCard, GhostCard } from './SandboxCard'
import { SandboxEditor } from './SandboxEditor'
import { createEmptySandboxContent } from '@/types'
import type { SandboxItem } from '@/types'

export function SandboxGrid() {
  // Store direct - pas de hook intermédiaire
  const sandboxItems = useAppStore((s) => s.sandboxItems)
  const sandboxLoading = useAppStore((s) => s.sandboxLoading)
  const sandboxError = useAppStore((s) => s.sandboxError)
  const sandboxCreating = useAppStore((s) => s.sandboxCreating)
  
  const fetchSandboxItems = useAppStore((s) => s.fetchSandboxItems)
  const createSandboxItem = useAppStore((s) => s.createSandboxItem)
  const deleteSandboxItem = useAppStore((s) => s.deleteSandboxItem)
  const pinSandboxItem = useAppStore((s) => s.pinSandboxItem)
  const clearSandboxError = useAppStore((s) => s.clearSandboxError)

  const [selectedItem, setSelectedItem] = useState<SandboxItem | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Refs pour éviter les appels multiples lors des re-renders (ALT+TAB, focus/blur, etc.)
  const hasFetchedRef = useRef(false)
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isCreatingRef = useRef(false) // Protection locale supplémentaire
  const isAltTabActiveRef = useRef(false) // Flag pour ignorer les mises à jour lors d'ALT+TAB

  // Notification - mémorisée pour éviter les re-créations (déclarée avant les refs)
  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    if (!isMountedRef.current) return
    setNotification({ type, message })
    setTimeout(() => {
      if (isMountedRef.current) {
        setNotification(null)
      }
    }, 3000)
  }, [])

  // Refs pour stocker les fonctions et éviter les recréations (après showNotification)
  const createSandboxItemRef = useRef(createSandboxItem)
  const showNotificationRef = useRef(showNotification)

  // Mettre à jour les refs quand les fonctions changent
  useEffect(() => {
    createSandboxItemRef.current = createSandboxItem
    showNotificationRef.current = showNotification
  }, [createSandboxItem, showNotification])

  // Charger les items au montage UNE SEULE FOIS
  useEffect(() => {
    // Ne fetch que si on n'a pas déjà fetché et que le composant est monté
    if (!hasFetchedRef.current && isMountedRef.current) {
      hasFetchedRef.current = true
      fetchSandboxItems()
    }

    // Protection contre les événements focus/blur qui pourraient déclencher des re-renders
    // ⚠️ SIMPLIFIÉ : On ignore juste les résultats si ALT+TAB est actif, mais on ne bloque pas la création
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isAltTabActiveRef.current = true
        console.log('👁️ Page hidden (ALT+TAB)')
      } else {
        // Désactiver IMMÉDIATEMENT pour permettre les nouvelles créations
        isAltTabActiveRef.current = false
        console.log('👁️ Page visible again, flag reset immediately')
      }
    }

    const handleFocus = () => {
      // Désactiver IMMÉDIATEMENT
      isAltTabActiveRef.current = false
      console.log('👁️ Window focused, flag reset immediately')
    }

    const handleBlur = () => {
      isAltTabActiveRef.current = true
      console.log('👁️ Window blurred (ALT+TAB)')
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    // Cleanup au démontage
    return () => {
      isMountedRef.current = false
      // Annuler toute requête en cours
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, []) // Dépendances vides pour éviter les réexécutions lors d'ALT+TAB

  // ⚠️ Réinitialiser les refs locales quand le store se réinitialise
  // Cela permet de débloquer la création après un timeout
  useEffect(() => {
    if (!sandboxCreating) {
      // Si sandboxCreating passe à false, réinitialiser IMMÉDIATEMENT les refs locales
      isCreatingRef.current = false
      console.log('🔄 sandboxCreating = false, resetting isCreatingRef')
    }
  }, [sandboxCreating])

  // Filtrer les brouillons
  const draftItems = sandboxItems.filter(item => item.status === 'draft')

  // Créer un brouillon - STABLE, jamais recréé, complètement isolé
  const handleNewDraft = useCallback(async () => {
    // Utiliser getState() pour avoir la valeur la plus récente
    const currentState = useAppStore.getState()
    console.log('🖱️ handleNewDraft called', { 
      sandboxCreating: currentState.sandboxCreating,
      isCreatingRef: isCreatingRef.current
    })
    
    // Protection SIMPLE : utiliser uniquement le state du store
    // Le store gère déjà les protections (timeout, ID unique, etc.)
    if (currentState.sandboxCreating) {
      console.log('⚠️ Creation already in progress (store), ignoring')
      return
    }

    // Protection locale pour éviter les doubles clics très rapides (< 500ms)
    // Mais on la réinitialise aussi si le store se réinitialise
    if (isCreatingRef.current) {
      console.log('⚠️ Local creation lock active, checking store...')
      // Vérifier à nouveau le store - si le timeout a réinitialisé, on peut continuer
      const recheckState = useAppStore.getState()
      if (recheckState.sandboxCreating) {
        console.log('⚠️ Store still creating, ignoring')
        return
      }
      // Si le store n'est plus en création, réinitialiser le ref et continuer
      console.log('✅ Store reset, clearing local lock and continuing')
      isCreatingRef.current = false
    }

    // Activer le lock local (sera réinitialisé par le useEffect si le store se réinitialise)
    isCreatingRef.current = true

    try {
      console.log('✅ Starting creation...')
      
      // Utiliser la ref pour avoir la fonction la plus récente sans dépendances
      const newItem = await createSandboxItemRef.current({
        title: 'Nouveau brouillon',
        content: createEmptySandboxContent('Nouveau brouillon'),
      })
      
      console.log('📦 Creation result:', { newItem })
      
      // Vérifier que le composant est toujours monté
      if (!isMountedRef.current) {
        console.log('⚠️ Component unmounted during creation, ignoring result')
        return
      }
      
      if (newItem) {
        console.log('✅ Item created successfully:', newItem.id)
        showNotificationRef.current('success', 'Brouillon créé')
        // Réinitialiser le lock local immédiatement en cas de succès
        isCreatingRef.current = false
      } else {
        console.log('⚠️ No item returned')
        // Attendre un peu pour que le state se mette à jour
        setTimeout(() => {
          if (isMountedRef.current) {
            const currentCreating = useAppStore.getState().sandboxCreating
            console.log('🔍 State check after timeout:', { currentCreating })
            if (!currentCreating) {
              showNotificationRef.current('error', 'Erreur lors de la création')
            }
            // Le lock local sera réinitialisé par le useEffect quand sandboxCreating passe à false
          }
        }, 200)
      }
    } catch (err) {
      console.error('❌ Creation error:', err)
      if (isMountedRef.current) {
        // Attendre un peu pour que le state se mette à jour
        setTimeout(() => {
          const currentCreating = useAppStore.getState().sandboxCreating
          if (!currentCreating) {
            showNotificationRef.current('error', 'Erreur lors de la création')
          }
          // Le lock local sera réinitialisé par le useEffect quand sandboxCreating passe à false
        }, 200)
      }
    }
    // ⚠️ SUPPRIMÉ : Le finally block qui réinitialisait après 1 seconde
    // Maintenant c'est géré par le useEffect qui écoute sandboxCreating
  }, []) // Dépendances vides - la fonction ne sera JAMAIS recréée

  // Épingler
  const handleValidate = async (item: SandboxItem) => {
    const result = await pinSandboxItem(item.id)
    
    if (result) {
      showNotification('success', `"${item.title}" épinglé`)
    } else {
      showNotification('error', 'Erreur lors de l\'épinglage')
    }
  }

  // Supprimer
  const handleDelete = async (item: SandboxItem) => {
    if (!window.confirm(`Supprimer "${item.title}" ?`)) return
    
    const success = await deleteSandboxItem(item.id)
    
    if (success) {
      showNotification('success', 'Brouillon supprimé')
    } else {
      showNotification('error', 'Erreur lors de la suppression')
    }
  }

  // Ouvrir éditeur
  const handleCardClick = (item: SandboxItem) => {
    setSelectedItem(item)
  }

  // Chargement
  if (sandboxLoading && sandboxItems.length === 0) {
    return (
      <section className="px-[10%] xl:px-[15%] py-8 pb-24">
        <div className="flex items-center gap-3 mb-6 max-w-4xl">
          <h3 className="font-serif text-2xl text-stone-800 italic">Bac à sable</h3>
        </div>
        <div className="flex items-center justify-center h-32 text-stone-400">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="px-[10%] xl:px-[15%] py-8 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 max-w-4xl">
          <h3 className="font-serif text-2xl text-stone-800 italic">Bac à sable</h3>
          <span className="text-[10px] font-bold bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full uppercase">
            Brouillons
          </span>
          {draftItems.length > 0 && (
            <span className="text-[10px] text-stone-400">
              {draftItems.length} élément{draftItems.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Toast */}
        {notification && (
          <div className={`
            fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg animate-slide-down-fade
            ${notification.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'}
          `}>
            {notification.message}
          </div>
        )}

        {/* Erreur */}
        {sandboxError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg max-w-4xl mb-4 flex justify-between items-center">
            <span>Erreur: {sandboxError.message}</span>
            <button onClick={clearSandboxError} className="text-red-400 hover:text-red-600 ml-4">✕</button>
          </div>
        )}

        {/* Grille */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl">
          {draftItems.map((item) => (
            <SandboxCard
              key={item.id}
              item={item}
              onValidate={handleValidate}
              onDelete={handleDelete}
              onClick={handleCardClick}
            />
          ))}

          <GhostCard 
            onClick={handleNewDraft} 
            disabled={sandboxCreating}
          />
        </div>

        {/* Message si vide */}
        {draftItems.length === 0 && (
          <p className="text-sm text-stone-400 mt-4 max-w-4xl">
            Cliquez sur "+" pour créer un nouveau brouillon.
          </p>
        )}
      </section>

      {/* Modal Editor */}
      {selectedItem && (
        <SandboxEditor
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={(updatedItem: SandboxItem) => setSelectedItem(updatedItem)}
        />
      )}
    </>
  )
}
