// ============================================================
// ARPET - App Store (Zustand)
// Version: 4.0.0 - Ajout Documents (sources.files)
// Date: 2025-12-18
// ============================================================

import { create } from 'zustand'
import type { 
  Message, 
  Project, 
  SandboxItem, 
  SandboxItemCreate,
  SourceFile,
  DocumentLayer,
  DocumentCategory
} from '../types'
import * as sandboxService from '../services/sandbox.service'
import * as documentsService from '../services/documents.service'

interface AppState {
  // ========================================
  // SIDEBAR
  // ========================================
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  
  // ========================================
  // PROJET ACTIF
  // ========================================
  activeProject: Project | null
  setActiveProject: (project: Project | null) => void
  
  // ========================================
  // CHAT (volatile)
  // ========================================
  messages: Message[]
  addMessage: (message: Message) => void
  clearMessages: () => void
  setMessageAnchored: (messageId: string) => void
  
  // ========================================
  // AGENT
  // ========================================
  isAgentTyping: boolean
  setIsAgentTyping: (typing: boolean) => void
  
  // ========================================
  // SANDBOX
  // ========================================
  sandboxItems: SandboxItem[]
  sandboxLoading: boolean
  sandboxError: Error | null
  sandboxCreating: boolean
  
  fetchSandboxItems: () => Promise<void>
  createSandboxItem: (input: SandboxItemCreate) => Promise<SandboxItem | null>
  deleteSandboxItem: (id: string) => Promise<boolean>
  pinSandboxItem: (id: string) => Promise<SandboxItem | null>
  unpinSandboxItem: (id: string) => Promise<SandboxItem | null>
  archiveSandboxItem: (id: string) => Promise<SandboxItem | null>
  clearSandboxError: () => void
  resetSandboxCreating: () => void
  
  // ========================================
  // DOCUMENTS (sources.files)
  // ========================================
  documents: SourceFile[]
  documentsLoading: boolean
  documentsError: Error | null
  documentsActiveLayer: DocumentLayer
  documentsActiveCategory: DocumentCategory | null
  documentsCounts: Record<DocumentLayer, number>
  
  // Actions Documents
  setDocumentsActiveLayer: (layer: DocumentLayer) => void
  setDocumentsActiveCategory: (category: DocumentCategory | null) => void
  fetchDocuments: (layer?: DocumentLayer) => Promise<void>
  fetchDocumentsCounts: () => Promise<void>
  uploadDocument: (file: File, category?: DocumentCategory, description?: string) => Promise<SourceFile | null>
  deleteDocument: (id: string) => Promise<boolean>
  requestDocumentPromotion: (id: string, comment?: string) => Promise<SourceFile | null>
  clearDocumentsError: () => void
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
  // SANDBOX - Actions
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
    const state = get()
    if (state.sandboxCreating) {
      console.log('⚠️ Creation already in progress, blocked')
      return null
    }
    
    set({ sandboxCreating: true, sandboxError: null })
    console.log('➕ Creating sandbox item...')
    
    try {
      const { data, error } = await sandboxService.createSandboxItem(input)
      
      if (error) throw error
      
      if (data) {
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
      
      console.log('⚠️ No data returned from create')
      set({ sandboxCreating: false })
      return null
      
    } catch (err) {
      console.error('❌ Create error:', err)
      set({ sandboxError: err as Error, sandboxCreating: false })
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
    console.log('🔄 Manual reset of sandboxCreating')
    set({ sandboxCreating: false })
  },

  // ========================================
  // DOCUMENTS - State
  // ========================================
  documents: [],
  documentsLoading: false,
  documentsError: null,
  documentsActiveLayer: 'app',
  documentsActiveCategory: null,
  documentsCounts: {
    app: 0,
    org: 0,
    project: 0,
    user: 0,
  },

  // ========================================
  // DOCUMENTS - Actions
  // ========================================

  setDocumentsActiveLayer: (layer) => {
    set({ documentsActiveLayer: layer, documentsActiveCategory: null })
    // Recharger les documents pour cette couche
    get().fetchDocuments(layer)
  },

  setDocumentsActiveCategory: (category) => {
    set({ documentsActiveCategory: category })
  },

  fetchDocuments: async (layer?: DocumentLayer) => {
    const state = get()
    const targetLayer = layer || state.documentsActiveLayer
    
    if (state.documentsLoading) {
      console.log('⚠️ Documents fetch already in progress')
      return
    }

    set({ documentsLoading: true, documentsError: null })
    console.log('📂 Fetching documents for layer:', targetLayer)

    try {
      // Pour la couche 'user', utiliser les mocks
      if (targetLayer === 'user') {
        const mockFiles = documentsService.getMockUserFiles()
        set({ 
          documents: mockFiles, 
          documentsLoading: false,
          documentsActiveLayer: targetLayer
        })
        console.log('✅ Mock user documents loaded:', mockFiles.length)
        return
      }

      // Pour les autres couches, appeler le service
      const activeProject = state.activeProject
      const { data, error } = await documentsService.getFilesByLayer(targetLayer, {
        projectId: targetLayer === 'project' ? activeProject?.id : undefined,
      })

      if (error) throw error

      set({ 
        documents: data || [], 
        documentsLoading: false,
        documentsActiveLayer: targetLayer
      })
      console.log('✅ Documents loaded:', data?.length || 0)
    } catch (err) {
      console.error('❌ Fetch documents error:', err)
      set({ documentsError: err as Error, documentsLoading: false })
    }
  },

  fetchDocumentsCounts: async () => {
    console.log('📊 Fetching documents counts...')

    try {
      const { data, error } = await documentsService.getFilesCountByLayer()

      if (error) throw error

      if (data) {
        // Ajouter le count des mocks pour user
        const mockCount = documentsService.getMockUserFiles().length
        set({ 
          documentsCounts: {
            ...data,
            user: data.user + mockCount
          }
        })
        console.log('✅ Counts loaded:', data)
      }
    } catch (err) {
      console.error('❌ Fetch counts error:', err)
    }
  },

  uploadDocument: async (file, category, description) => {
    set({ documentsError: null })
    console.log('📤 Uploading document:', file.name)

    try {
      const state = get()
      const { data, error } = await documentsService.uploadFile({
        file,
        category,
        description,
        projectId: state.activeProject?.id,
      })

      if (error) throw error

      if (data) {
        // Si on est sur la couche 'user', ajouter au state
        if (state.documentsActiveLayer === 'user') {
          set((s) => ({
            documents: [data, ...s.documents]
          }))
        }
        
        // Mettre à jour les counts
        set((s) => ({
          documentsCounts: {
            ...s.documentsCounts,
            user: s.documentsCounts.user + 1
          }
        }))

        console.log('✅ Document uploaded:', data.id)
        return data
      }

      return null
    } catch (err) {
      console.error('❌ Upload error:', err)
      set({ documentsError: err as Error })
      return null
    }
  },

  deleteDocument: async (id) => {
    set({ documentsError: null })
    console.log('🗑️ Deleting document:', id)

    try {
      // Vérifier si c'est un mock
      if (id.startsWith('mock-')) {
        set((state) => ({
          documents: state.documents.filter(doc => doc.id !== id),
          documentsCounts: {
            ...state.documentsCounts,
            user: Math.max(0, state.documentsCounts.user - 1)
          }
        }))
        console.log('✅ Mock document deleted:', id)
        return true
      }

      const { error } = await documentsService.deleteFile(id)

      if (error) throw error

      set((state) => ({
        documents: state.documents.filter(doc => doc.id !== id),
        documentsCounts: {
          ...state.documentsCounts,
          user: Math.max(0, state.documentsCounts.user - 1)
        }
      }))

      console.log('✅ Document deleted:', id)
      return true
    } catch (err) {
      console.error('❌ Delete error:', err)
      set({ documentsError: err as Error })
      return false
    }
  },

  requestDocumentPromotion: async (id, comment) => {
    set({ documentsError: null })
    console.log('📤 Requesting promotion:', id)

    try {
      // Vérifier si c'est un mock
      if (id.startsWith('mock-')) {
        set((state) => ({
          documents: state.documents.map(doc => 
            doc.id === id 
              ? { 
                  ...doc, 
                  promotion_status: 'pending' as const,
                  promotion_requested_at: new Date().toISOString(),
                  promotion_comment: comment || null
                }
              : doc
          )
        }))
        console.log('✅ Mock promotion requested:', id)
        return get().documents.find(d => d.id === id) || null
      }

      const { data, error } = await documentsService.requestPromotion(id, comment)

      if (error) throw error

      if (data) {
        set((state) => ({
          documents: state.documents.map(doc => 
            doc.id === id ? data : doc
          )
        }))
        console.log('✅ Promotion requested:', id)
      }

      return data
    } catch (err) {
      console.error('❌ Request promotion error:', err)
      set({ documentsError: err as Error })
      return null
    }
  },

  clearDocumentsError: () => set({ documentsError: null }),
}))
