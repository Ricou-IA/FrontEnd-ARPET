// ============================================================
// ARPET - SandboxGrid Component
// Version: 4.0.0 - UX Refonte (3 colonnes + GhostCard premier)
// Date: 2025-12-04
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/stores/appStore'
import { SandboxCard, GhostCard } from './SandboxCard'
import { SandboxEditor } from './SandboxEditor'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { createEmptySandboxContent } from '@/types'
import type { SandboxItem } from '@/types'

export function SandboxGrid() {
  // ========================================
  // STORE
  // ========================================
  const sandboxItems = useAppStore((s) => s.sandboxItems)
  const sandboxLoading = useAppStore((s) => s.sandboxLoading)
  const sandboxError = useAppStore((s) => s.sandboxError)
  const sandboxCreating = useAppStore((s) => s.sandboxCreating)
  
  const fetchSandboxItems = useAppStore((s) => s.fetchSandboxItems)
  const createSandboxItem = useAppStore((s) => s.createSandboxItem)
  const deleteSandboxItem = useAppStore((s) => s.deleteSandboxItem)
  const pinSandboxItem = useAppStore((s) => s.pinSandboxItem)
  const clearSandboxError = useAppStore((s) => s.clearSandboxError)

  // ========================================
  // LOCAL STATE
  // ========================================
  const [selectedItem, setSelectedItem] = useState<SandboxItem | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [itemToDelete, setItemToDelete] = useState<SandboxItem | null>(null)

  const hasFetchedRef = useRef(false)

  // ========================================
  // FETCH AU MOUNT
  // ========================================
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchSandboxItems()
    }
  }, [fetchSandboxItems])

  // ========================================
  // HELPERS
  // ========================================
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  // Filtrer les brouillons
  const draftItems = sandboxItems.filter(item => item.status === 'draft')

  // ========================================
  // HANDLERS
  // ========================================
  
  const handleNewDraft = async () => {
    if (sandboxCreating) return

    const newItem = await createSandboxItem({
      title: 'Nouveau brouillon',
      content: createEmptySandboxContent('Nouveau brouillon'),
    })
    
    if (newItem) {
      showNotification('success', 'Brouillon créé')
      // Ouvrir directement l'éditeur
      setSelectedItem(newItem)
    } else {
      const currentError = useAppStore.getState().sandboxError
      if (currentError) {
        showNotification('error', 'Erreur lors de la création')
      }
    }
  }

  const handleValidate = async (item: SandboxItem) => {
    const result = await pinSandboxItem(item.id)
    
    if (result) {
      showNotification('success', `"${item.title}" épinglé`)
    } else {
      showNotification('error', 'Erreur lors de l\'épinglage')
    }
  }

  const handleDelete = async (item: SandboxItem) => {
    setItemToDelete(item)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    
    const success = await deleteSandboxItem(itemToDelete.id)
    
    if (success) {
      showNotification('success', 'Brouillon supprimé')
    } else {
      showNotification('error', 'Erreur lors de la suppression')
    }
    
    setItemToDelete(null)
  }

  const handleCardClick = (item: SandboxItem) => {
    setSelectedItem(item)
  }

  // Callback quand l'éditeur met à jour un item
  const handleItemUpdate = (updatedItem: SandboxItem) => {
    setSelectedItem(updatedItem)
  }

  // Callback quand l'éditeur supprime un item
  const handleItemDelete = () => {
    setSelectedItem(null)
  }

  // ========================================
  // RENDER - Loading
  // ========================================
  if (sandboxLoading && sandboxItems.length === 0) {
    return (
      <section className="px-[10%] xl:px-[15%] py-8 pb-24">
        <div className="flex items-center gap-3 mb-6">
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

  // ========================================
  // RENDER - Main
  // ========================================
  return (
    <>
      <section className="px-[10%] xl:px-[15%] py-8 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
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

        {/* Toast Notification */}
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
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
            <span>Erreur: {sandboxError.message}</span>
            <button onClick={clearSandboxError} className="text-red-400 hover:text-red-600 ml-4">✕</button>
          </div>
        )}

        {/* Grille 3 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* GhostCard EN PREMIER */}
          <GhostCard 
            onClick={handleNewDraft} 
            disabled={sandboxCreating}
          />

          {/* Cartes Draft */}
          {draftItems.map((item) => (
            <SandboxCard
              key={item.id}
              item={item}
              onValidate={handleValidate}
              onDelete={handleDelete}
              onClick={handleCardClick}
            />
          ))}
        </div>

        {/* Message si vide */}
        {draftItems.length === 0 && !sandboxCreating && (
          <p className="text-sm text-stone-400 mt-4">
            Cliquez sur "+" pour créer un nouveau brouillon.
          </p>
        )}
      </section>

      {/* Modal Editor */}
      {selectedItem && (
        <SandboxEditor
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleItemUpdate}
          onDelete={handleItemDelete}
        />
      )}

      {/* Dialog de confirmation suppression */}
      <ConfirmDialog
        isOpen={itemToDelete !== null}
        title="Supprimer ce brouillon ?"
        message={`"${itemToDelete?.title}" sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </>
  )
}
