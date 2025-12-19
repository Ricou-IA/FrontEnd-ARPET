// ============================================================
// ARPET - App Store (Zustand)
// Version: 4.5.0 - Ajout state Viewer (Split View)
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
  DocumentCategoryConfig,
  ViewerDocument
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
  documentsActiveCategory: string | null
  documentsCounts: Record<DocumentLayer, number>
  
  // Catégories depuis Supabase
  availableCategories: DocumentCategoryConfig[]
  categoriesLoading: boolean
  
  // Projets utilisateur (pour édition)
  userProjects: Project[]
  userProjectsLoading: boolean
  
  // Actions Documents
  setDocumentsActiveLayer: (layer: DocumentLayer) => void
  setDocumentsActiveCategory: (categoryId: string | null) => void
  fetchDocuments: (layer?: DocumentLayer) => Promise<void>
  fetchDocumentsCounts: () => Promise<void>
  fetchDocumentCategories: (layer?: DocumentLayer) => Promise<void>
  uploadDocument: (file: File, categoryId?: string, description?: string) => Promise<SourceFile | null>
  updateDocument: (id: string, updates: { filename?: string; categoryId?: string; description?: string; projectId?: string | null }) => Promise<SourceFile | null>
  deleteDocument: (id: string) => Promise<boolean>
  requestDocumentPromotion: (id: string, comment?: string) => Promise<SourceFile | null>
  clearDocumentsError: () => void
  fetchUserProjects: () => Promise<void>

  // ========================================
  // VIEWER (Split View)
  // ========================================
  viewerOpen: boolean
  viewerDocument: ViewerDocument | null
  viewerCurrentPage: number
  viewerTotalPages: number
  viewerZoom: number
  viewerLoading: boolean

  // Actions Viewer
  openViewer: (document: ViewerDocument) => void
  closeViewer: () => void
  setViewerPage: (page: number) => void
  setViewerTotalPages: (total: number) => void
  setViewerZoom: (zoom: number) => void
  setViewerLoading: (loading: boolean) => void
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
  setActiveProject: (project) => {
    set({ activeProject: project })
    // Recalculer les counts quand le projet change
    get().fetchDocumentsCounts()
  },
  
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
  
  // Catégories
  availableCategories: [],
  categoriesLoading: false,
  
  // Projets utilisateur
  userProjects: [],
  userProjectsLoading: false,

  // ========================================
  // DOCUMENTS - Actions
  // ========================================

  setDocumentsActiveLayer: (layer) => {
    set({ documentsActiveLayer: layer, documentsActiveCategory: null })
    // Recharger les documents et catégories pour cette couche
    get().fetchDocuments(layer)
    get().fetchDocumentCategories(layer)
  },

  setDocumentsActiveCategory: (categoryId) => {
    set({ documentsActiveCategory: categoryId })
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
    const state = get()
    console.log('📊 Fetching documents counts...')

    try {
      const { data, error } = await documentsService.getFilesCountByLayer(
        state.activeProject?.id
      )

      if (error) throw error

      if (data) {
        set({ documentsCounts: data })
        console.log('✅ Counts loaded:', data)
      }
    } catch (err) {
      console.error('❌ Fetch counts error:', err)
    }
  },

  fetchDocumentCategories: async (layer?: DocumentLayer) => {
    const state = get()
    const targetLayer = layer || state.documentsActiveLayer

    if (state.categoriesLoading) {
      console.log('⚠️ Categories fetch already in progress')
      return
    }

    set({ categoriesLoading: true })
    console.log('🏷️ Fetching categories for layer:', targetLayer)

    try {
      const { data, error } = await documentsService.getDocumentCategories(targetLayer)

      if (error) throw error

      set({ 
        availableCategories: data || [],
        categoriesLoading: false
      })
      console.log('✅ Categories loaded:', data?.length || 0)
    } catch (err) {
      console.error('❌ Fetch categories error:', err)
      set({ categoriesLoading: false })
    }
  },

  uploadDocument: async (file, categoryId, description) => {
    set({ documentsError: null })
    console.log('📤 Uploading document:', file.name)

    try {
      const state = get()
      const { data, error } = await documentsService.uploadFile({
        file,
        categoryId,
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

  updateDocument: async (id, updates) => {
    set({ documentsError: null })
    console.log('✏️ Updating document:', id, updates)

    try {
      const { data, error } = await documentsService.updateFile(id, {
        original_filename: updates.filename,
        categoryId: updates.categoryId,
        description: updates.description,
        project_id: updates.projectId,
      })

      if (error) throw error

      if (data) {
        set((state) => ({
          documents: state.documents.map(doc => 
            doc.id === id ? data : doc
          )
        }))
        console.log('✅ Document updated:', id)
      }

      return data
    } catch (err) {
      console.error('❌ Update error:', err)
      set({ documentsError: err as Error })
      return null
    }
  },

  deleteDocument: async (id) => {
    set({ documentsError: null })
    console.log('🗑️ Deleting document:', id)

    try {
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

  fetchUserProjects: async () => {
    const state = get()
    if (state.userProjectsLoading) {
      console.log('⚠️ User projects fetch already in progress')
      return
    }

    set({ userProjectsLoading: true })
    console.log('📂 Fetching user projects...')

    try {
      const { data, error } = await documentsService.getUserProjects()

      if (error) throw error

      set({ 
        userProjects: data || [], 
        userProjectsLoading: false 
      })
      console.log('✅ User projects loaded:', data?.length || 0)
    } catch (err) {
      console.error('❌ Fetch user projects error:', err)
      set({ userProjectsLoading: false })
    }
  },

  // ========================================
  // VIEWER - State
  // ========================================
  viewerOpen: false,
  viewerDocument: null,
  viewerCurrentPage: 1,
  viewerTotalPages: 1,
  viewerZoom: 1,
  viewerLoading: false,

  // ========================================
  // VIEWER - Actions
  // ========================================

  openViewer: (document) => {
    console.log('👁️ Opening viewer:', document.filename)
    set({
      viewerOpen: true,
      viewerDocument: document,
      viewerCurrentPage: document.initialPage || 1,
      viewerTotalPages: 1,
      viewerZoom: 1,
      viewerLoading: true,
    })
  },

  closeViewer: () => {
    console.log('❌ Closing viewer')
    set({
      viewerOpen: false,
      viewerDocument: null,
      viewerCurrentPage: 1,
      viewerTotalPages: 1,
      viewerZoom: 1,
      viewerLoading: false,
    })
  },

  setViewerPage: (page) => {
    const state = get()
    if (page >= 1 && page <= state.viewerTotalPages) {
      set({ viewerCurrentPage: page })
    }
  },

  setViewerTotalPages: (total) => {
    set({ viewerTotalPages: total })
  },

  setViewerZoom: (zoom) => {
    // Limiter le zoom entre 0.5 et 2
    const clampedZoom = Math.max(0.5, Math.min(2, zoom))
    set({ viewerZoom: clampedZoom })
  },

  setViewerLoading: (loading) => {
    set({ viewerLoading: loading })
  },
}))
