import { useState } from 'react'
import { useSandboxItems } from '@/hooks/useSandbox'
import { SandboxCard, GhostCard } from './SandboxCard'
import { createEmptySandboxContent } from '@/types'
import type { SandboxItem } from '@/types'

export function SandboxGrid() {
  const {
    items,
    loading,
    error,
    create,
    remove,
    pin,
  } = useSandboxItems()

  const [isCreating, setIsCreating] = useState(false)

  // Filtrer uniquement les brouillons (drafts)
  const draftItems = items.filter(item => item.status === 'draft')

  // Valider un item (le passer en "pinned" → Espace de Travail)
  const handleValidate = async (item: SandboxItem) => {
    await pin(item.id)
  }

  // Supprimer un item
  const handleDelete = async (item: SandboxItem) => {
    if (window.confirm('Supprimer ce brouillon ?')) {
      await remove(item.id)
    }
  }

  // Créer un nouveau brouillon
  const handleNewDraft = async () => {
    setIsCreating(true)
    
    const newItem = await create({
      title: 'Nouveau brouillon',
      content: createEmptySandboxContent('Nouveau brouillon'),
    })
    
    if (newItem) {
      // TODO: Ouvrir le sandbox en mode édition
      console.log('Sandbox créé:', newItem.id)
    }
    
    setIsCreating(false)
  }

  // Affichage du chargement
  if (loading) {
    return (
      <section className="px-[10%] xl:px-[15%] py-8 pb-24">
        <div className="flex items-center gap-3 mb-6 max-w-4xl mx-auto sm:mx-0">
          <h3 className="font-serif text-2xl text-stone-800 italic">Bac à sable</h3>
        </div>
        <div className="flex items-center justify-center h-32 text-stone-400">
          Chargement...
        </div>
      </section>
    )
  }

  // Affichage de l'erreur
  if (error) {
    return (
      <section className="px-[10%] xl:px-[15%] py-8 pb-24">
        <div className="flex items-center gap-3 mb-6 max-w-4xl mx-auto sm:mx-0">
          <h3 className="font-serif text-2xl text-stone-800 italic">Bac à sable</h3>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg max-w-4xl">
          Erreur: {error.message}
        </div>
      </section>
    )
  }

  return (
    <section className="px-[10%] xl:px-[15%] py-8 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 max-w-4xl mx-auto sm:mx-0">
        <h3 className="font-serif text-2xl text-stone-800 italic">Bac à sable</h3>
        <span className="text-[10px] font-sans font-bold bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full uppercase tracking-wide">
          Brouillons
        </span>
        {draftItems.length > 0 && (
          <span className="text-[10px] font-sans font-medium text-stone-400">
            {draftItems.length} élément{draftItems.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl mx-auto sm:mx-0">
        {/* Items existants */}
        {draftItems.map((item, index) => (
          <SandboxCard
            key={item.id}
            item={item}
            onValidate={handleValidate}
            onDelete={handleDelete}
            isNew={index === 0 && items.length > 0}
          />
        ))}

        {/* Ghost Card */}
        <GhostCard 
          onClick={handleNewDraft} 
          disabled={isCreating}
        />
      </div>

      {/* Message si vide */}
      {draftItems.length === 0 && (
        <p className="text-sm text-stone-400 mt-4 max-w-4xl mx-auto sm:mx-0">
          Cliquez sur "+" pour créer un nouveau brouillon ou ancrez des réponses depuis le chat.
        </p>
      )}
    </section>
  )
}

// ============================================
// ESPACE DE TRAVAIL (Items épinglés)
// ============================================

export function WorkspaceGrid() {
  const {
    items,
    loading,
    error,
    unpin,
    archive,
  } = useSandboxItems()

  // Filtrer uniquement les items épinglés
  const pinnedItems = items.filter(item => item.status === 'pinned')

  // Repasser en draft pour modification
  const handleEdit = async (item: SandboxItem) => {
    await unpin(item.id)
  }

  // Archiver un item
  const handleArchive = async (item: SandboxItem) => {
    if (window.confirm('Archiver ce widget ?')) {
      await archive(item.id)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
          Espace de travail
        </h3>
        <div className="text-stone-400 text-sm">Chargement...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
          Espace de travail
        </h3>
        <div className="text-red-500 text-sm">Erreur: {error.message}</div>
      </div>
    )
  }

  if (pinnedItems.length === 0) {
    return null // Ne pas afficher si vide
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
        Espace de travail
      </h3>
      <div className="space-y-2">
        {pinnedItems.map(item => (
          <WorkspaceWidgetCard
            key={item.id}
            item={item}
            onEdit={handleEdit}
            onArchive={handleArchive}
          />
        ))}
      </div>
    </div>
  )
}

// Carte widget pour l'espace de travail (sidebar)
interface WorkspaceWidgetCardProps {
  item: SandboxItem
  onEdit?: (item: SandboxItem) => void
  onArchive?: (item: SandboxItem) => void
  onRefresh?: (item: SandboxItem) => void
}

function WorkspaceWidgetCard({ item, onEdit, onArchive, onRefresh }: WorkspaceWidgetCardProps) {
  const hasRoutine = item.content.routine != null
  const lastRun = item.content.display?.last_run_at
    ? new Date(item.content.display.last_run_at)
    : null

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3 group hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-stone-800 truncate">
            {item.title}
          </h4>
          {lastRun && (
            <p className="text-[10px] text-stone-400 mt-0.5">
              MAJ: {lastRun.toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          {hasRoutine && onRefresh && (
            <button
              onClick={() => onRefresh(item)}
              className="p-1 text-stone-300 hover:text-blue-500 hover:bg-blue-50 rounded"
              title="Mettre à jour"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(item)}
              className="p-1 text-stone-300 hover:text-orange-500 hover:bg-orange-50 rounded"
              title="Modifier"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          {onArchive && (
            <button
              onClick={() => onArchive(item)}
              className="p-1 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded"
              title="Archiver"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
