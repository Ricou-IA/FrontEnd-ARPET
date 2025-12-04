import { create } from 'zustand'
import type { Message, Project, SandboxItem, SandboxItemStatus } from '../types'

interface AppState {
  // Sidebar
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  
  // Projet actif
  activeProject: Project | null
  setActiveProject: (project: Project | null) => void
  
  // Chat (volatile - non persisté)
  messages: Message[]
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, updates: Partial<Message>) => void
  clearMessages: () => void
  setMessageAnchored: (messageId: string) => void
  
  // Sandbox
  sandboxItems: SandboxItem[]
  setSandboxItems: (items: SandboxItem[]) => void
  addSandboxItem: (item: SandboxItem) => void
  removeSandboxItem: (itemId: string) => void
  updateSandboxItemStatus: (itemId: string, status: SandboxItemStatus) => void
  
  // UI State
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  
  // Chat input
  isAgentTyping: boolean
  setIsAgentTyping: (typing: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Sidebar - ouvert par défaut
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  // Projet actif
  activeProject: null,
  setActiveProject: (project) => set({ activeProject: project }),
  
  // Chat messages (volatile)
  messages: [],
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  updateMessage: (messageId, updates) => set((state) => ({
    messages: state.messages.map((m) => 
      m.id === messageId ? { ...m, ...updates } : m
    )
  })),
  clearMessages: () => set({ messages: [] }),
  setMessageAnchored: (messageId) => set((state) => ({
    messages: state.messages.map((m) =>
      m.id === messageId ? { ...m, isAnchored: true } : m
    )
  })),
  
  // Sandbox items
  sandboxItems: [],
  setSandboxItems: (items) => set({ sandboxItems: items }),
  addSandboxItem: (item) => set((state) => ({ 
    sandboxItems: [item, ...state.sandboxItems] 
  })),
  removeSandboxItem: (itemId) => set((state) => ({
    sandboxItems: state.sandboxItems.filter((item) => item.id !== itemId)
  })),
  updateSandboxItemStatus: (itemId, status) => set((state) => ({
    sandboxItems: state.sandboxItems.map((item) =>
      item.id === itemId ? { ...item, status } : item
    )
  })),
  
  // UI State
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  isAgentTyping: false,
  setIsAgentTyping: (typing) => set({ isAgentTyping: typing }),
}))
