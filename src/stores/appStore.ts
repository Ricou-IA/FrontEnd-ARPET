// ============================================================
// ARPET - App Store (Zustand)
// Version: 3.0.0 - Compatible migration schémas
// Date: 2025-12-11
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
  
  // Actions Sandbox
  fetchSandboxItems: () => Promise<void>
  createSandboxItem: (input: SandboxItemCreate) => Promise<SandboxItem | null>
  deleteSandboxItem: (id: string) => Promise<boolean>
  pinSandboxItem: (id: string) => Promise<SandboxItem | null>
  unpinSandboxItem: (id: string) => Promise<SandboxItem | null>
  archiveSandboxItem: (id: string) => Promise<SandboxItem | null>
  clearSandboxError: () => void
  resetSandboxCreating: () => void
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
  
  // ========================================
  // SANDBOX - Actions (SIMPLIFIED & ROBUST)
  // ========================================
  
  fetchSandboxItems: async () => {
    const state = get()
    if (state.sandboxLoading) {
      console.log('⚠️ Fetch already in progress, skipping')
      return
    }
    
    set({ sandboxLoading: true, sandboxError: null })
    
    try {
      const { data, error } = await sandboxService.getSandboxItems()
      
      if (error) throw error
      
      set({ sandboxItems: data || [], sandboxLoading: false })
      console.log('✅ Sandbox items loaded:', data?.length || 0)
    } catch (err) {
      console.error('❌ Fetch error:', err)
      set({ sandboxError: err as Error, sandboxLoading: false })
    }
  },
  
  createSandboxItem: async (input) => {
    // ========================================
    // SIMPLE LOCK - Pas de creationId complexe
    // ========================================
    const state = get()
    if (state.sandboxCreating) {
      console.log('⚠️ Creation already in progress, blocked')
      return null
    }
    
    // Lock immédiat
    set({ sandboxCreating: true, sandboxError: null })
    console.log('➕ Creating sandbox item...')
    
    try {
      const { data, error } = await sandboxService.createSandboxItem(input)
      
      if (error) throw error
      
      if (data) {
        // Vérifier que l'item n'existe pas déjà (éviter doublons)
        const currentItems = get().sandboxItems
        const exists = currentItems.some(item => item.id === data.id)
        
        if (exists) {
          console.log('⚠️ Item already exists, updating')
          set({
            sandboxItems: currentItems.map(item => 
              item.id === data.id ? data : item
            ),
            sandboxCreating: false
          })
        } else {
          set({ 
            sandboxItems: [data, ...currentItems],
            sandboxCreating: false
          })
        }
        
        console.log('✅ Created:', data.id)
        return data
      }
      
      // Pas de data mais pas d'erreur non plus
      console.log('⚠️ No data returned from create')
      set({ sandboxCreating: false })
      return null
      
    } catch (err) {
      console.error('❌ Create error:', err)
      set({ sandboxError: err as Error, sandboxCreating: false })
      return null
    }
    // ========================================
    // ✅ GARANTIE : sandboxCreating est TOUJOURS
    //    remis à false, peu importe le chemin
    // ========================================
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
    console.log('🔄 Manual reset of sandboxCreating')
    set({ sandboxCreating: false })
  },
}))
