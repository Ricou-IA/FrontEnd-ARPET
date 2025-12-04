// ============================================================
// ARPET - App Store (Zustand)
// Version: 2.0.0 - Sandbox actions intégrées
// Date: 2025-12-04
// ============================================================

import { create } from 'zustand'
import type { Message, Project, SandboxItem, SandboxItemCreate } from '../types'
import * as sandboxService from '../services/sandbox.service'

interface AppState {
  // Sidebar
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  
  // Projet actif
  activeProject: Project | null
  setActiveProject: (project: Project | null) => void
  
  // Chat (volatile)
  messages: Message[]
  addMessage: (message: Message) => void
  clearMessages: () => void
  setMessageAnchored: (messageId: string) => void
  
  // Agent
  isAgentTyping: boolean
  setIsAgentTyping: (typing: boolean) => void
  
  // ========================================
  // SANDBOX - State & Actions
  // ========================================
  sandboxItems: SandboxItem[]
  sandboxLoading: boolean
  sandboxError: Error | null
  sandboxCreating: boolean
  sandboxCreationId: string | null // ID unique pour chaque création
  
  // Actions Sandbox
  fetchSandboxItems: () => Promise<void>
  createSandboxItem: (input: SandboxItemCreate) => Promise<SandboxItem | null>
  deleteSandboxItem: (id: string) => Promise<boolean>
  pinSandboxItem: (id: string) => Promise<SandboxItem | null>
  unpinSandboxItem: (id: string) => Promise<SandboxItem | null>
  archiveSandboxItem: (id: string) => Promise<SandboxItem | null>
  clearSandboxError: () => void
  resetSandboxCreating: () => void // Réinitialisation d'urgence
}

export const useAppStore = create<AppState>((set, get) => ({
  // ========================================
  // SIDEBAR
  // ========================================
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  // ========================================
  // PROJET
  // ========================================
  activeProject: null,
  setActiveProject: (project) => set({ activeProject: project }),
  
  // ========================================
  // CHAT
  // ========================================
  messages: [],
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  clearMessages: () => set({ messages: [] }),
  setMessageAnchored: (messageId) => set((state) => ({
    messages: state.messages.map((m) =>
      m.id === messageId ? { ...m, isAnchored: true } : m
    )
  })),
  
  // ========================================
  // AGENT
  // ========================================
  isAgentTyping: false,
  setIsAgentTyping: (typing) => set({ isAgentTyping: typing }),
  
  // ========================================
  // SANDBOX - State
  // ========================================
  sandboxItems: [],
  sandboxLoading: false,
  sandboxError: null,
  sandboxCreating: false,
  sandboxCreationId: null,
  
  // ========================================
  // SANDBOX - Actions
  // ========================================
  
  fetchSandboxItems: async () => {
    // Éviter les appels multiples OU pendant une création
    const state = get()
    if (state.sandboxLoading || state.sandboxCreating) {
      console.log('⚠️ Fetch blocked: already loading or creating')
      return
    }
    
    set({ sandboxLoading: true, sandboxError: null })
    
    try {
      const { data, error } = await sandboxService.getSandboxItems()
      
      if (error) throw error
      
      // Vérifier qu'on n'est pas en train de créer avant de mettre à jour
      // (pour éviter d'écraser un item qui vient d'être créé)
      if (!get().sandboxCreating) {
        set({ sandboxItems: data || [], sandboxLoading: false })
        console.log('✅ Sandbox items loaded:', data?.length || 0)
      } else {
        console.log('⚠️ Fetch completed but creation in progress, skipping update')
        set({ sandboxLoading: false })
      }
    } catch (err) {
      console.error('❌ Fetch error:', err)
      set({ sandboxError: err as Error, sandboxLoading: false })
    }
  },
  
  createSandboxItem: async (input) => {
    // LOCK: Éviter les créations multiples - vérification atomique
    const state = get()
    if (state.sandboxCreating) {
      console.log('⚠️ Already creating, blocked')
      return null
    }
    
    // Générer un ID unique pour cette création
    const creationId = `create-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Bloquer aussi les fetches pendant la création
    set({ 
      sandboxCreating: true, 
      sandboxError: null, 
      sandboxLoading: false,
      sandboxCreationId: creationId
    })
    console.log('➕ Creating sandbox item...', { creationId })
    
    // Timeout de sécurité (10 secondes)
    // Si la création prend trop de temps, réinitialiser l'état
    // ⚠️ IMPORTANT : Stocker le timeoutId dans une variable accessible pour pouvoir l'annuler
    let timeoutId: NodeJS.Timeout | null = null
    timeoutId = setTimeout(() => {
      const currentState = get()
      // Vérifier que c'est toujours la même création
      if (currentState.sandboxCreationId === creationId && currentState.sandboxCreating) {
        console.log('⏱️ Creation timeout (3s), resetting state')
        set({ 
          sandboxCreating: false, 
          sandboxCreationId: null,
          sandboxError: new Error('La création a pris trop de temps. Veuillez réessayer.')
        })
      }
    }, 3000) // 3 secondes pour les tests
    
    try {
      const { data, error } = await sandboxService.createSandboxItem(input)
      
      // Vérifier IMMÉDIATEMENT que c'est toujours la même création (protection ALT+TAB)
      // AVANT d'annuler le timeout
      const currentState = get()
      if (currentState.sandboxCreationId !== creationId) {
        console.log('⚠️ Creation ID mismatch, ignoring result (ALT+TAB?)', {
          expected: creationId,
          current: currentState.sandboxCreationId
        })
        // Annuler le timeout et ne pas mettre à jour le state
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        return null
      }
      
      // Annuler le timeout si la création réussit et que l'ID correspond
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      
      if (error) throw error
      
      if (data) {
        // Ajouter l'item au début de la liste
        set((state) => {
          // Vérifier à nouveau l'ID avant de mettre à jour
          if (state.sandboxCreationId !== creationId) {
            console.log('⚠️ Creation ID mismatch during update, ignoring')
            return state
          }
          
          // Vérifier qu'il n'est pas déjà présent (éviter les doublons)
          const exists = state.sandboxItems.some(item => item.id === data.id)
          if (exists) {
            console.log('⚠️ Item already exists, updating instead')
            return {
              sandboxItems: state.sandboxItems.map(item => 
                item.id === data.id ? data : item
              ),
              sandboxCreating: false,
              sandboxCreationId: null
            }
          }
          return { 
            sandboxItems: [data, ...state.sandboxItems],
            sandboxCreating: false,
            sandboxCreationId: null
          }
        })
        console.log('✅ Created:', data.id)
        return data
      }
      
      // Toujours réinitialiser sandboxCreating, même si data est null
      set((state) => {
        // Vérifier l'ID avant de réinitialiser
        if (state.sandboxCreationId !== creationId) {
          return state
        }
        return { sandboxCreating: false, sandboxCreationId: null }
      })
      return null
    } catch (err) {
      // Annuler le timeout en cas d'erreur
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      
      console.error('❌ Create error:', err)
      // Vérifier l'ID avant de réinitialiser
      const currentState = get()
      if (currentState.sandboxCreationId === creationId) {
        set({ sandboxError: err as Error, sandboxCreating: false, sandboxCreationId: null })
      }
      return null
    }
  },
  
  deleteSandboxItem: async (id) => {
    set({ sandboxError: null })
    console.log('🗑️ Deleting:', id)
    
    try {
      const { error } = await sandboxService.deleteSandboxItem(id)
      
      if (error) throw error
      
      set((state) => ({ 
        sandboxItems: state.sandboxItems.filter(item => item.id !== id) 
      }))
      console.log('✅ Deleted:', id)
      return true
    } catch (err) {
      console.error('❌ Delete error:', err)
      set({ sandboxError: err as Error })
      return false
    }
  },
  
  pinSandboxItem: async (id) => {
    set({ sandboxError: null })
    console.log('📌 Pinning:', id)
    
    try {
      const { data, error } = await sandboxService.pinSandboxItem(id)
      
      if (error) throw error
      
      if (data) {
        set((state) => ({
          sandboxItems: state.sandboxItems.map(item => 
            item.id === id ? data : item
          )
        }))
        console.log('✅ Pinned:', id)
      }
      
      return data
    } catch (err) {
      console.error('❌ Pin error:', err)
      set({ sandboxError: err as Error })
      return null
    }
  },
  
  unpinSandboxItem: async (id) => {
    set({ sandboxError: null })
    console.log('📍 Unpinning:', id)
    
    try {
      const { data, error } = await sandboxService.unpinSandboxItem(id)
      
      if (error) throw error
      
      if (data) {
        set((state) => ({
          sandboxItems: state.sandboxItems.map(item => 
            item.id === id ? data : item
          )
        }))
      }
      
      return data
    } catch (err) {
      console.error('❌ Unpin error:', err)
      set({ sandboxError: err as Error })
      return null
    }
  },
  
  archiveSandboxItem: async (id) => {
    set({ sandboxError: null })
    console.log('🗃️ Archiving:', id)
    
    try {
      const { data, error } = await sandboxService.archiveSandboxItem(id)
      
      if (error) throw error
      
      if (data) {
        set((state) => ({
          sandboxItems: state.sandboxItems.filter(item => item.id !== id)
        }))
      }
      
      return data
    } catch (err) {
      console.error('❌ Archive error:', err)
      set({ sandboxError: err as Error })
      return null
    }
  },
  
  clearSandboxError: () => set({ sandboxError: null }),
  
  resetSandboxCreating: () => {
    console.log('🔄 Resetting sandbox creating state (emergency)')
    set({ sandboxCreating: false, sandboxCreationId: null })
  },
}))
