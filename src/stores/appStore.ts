// ============================================================
// ARPET - App Store (Zustand)
// Version: 5.0.0 - Suppression Sandbox, ajout Conversations
// Date: 2025-12-19
// ============================================================

import { create } from 'zustand'
import type { 
  Message, 
  Project, 
  SourceFile,
  DocumentLayer,
  DocumentCategoryConfig,
  ViewerDocument,
  SavedConversation,
  SavedConversationCreate
} from '../types'
import * as documentsService from '../services/documents.service'
import * as conversationsService from '../services/conversations.service'

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
  setMessages: (messages: Message[]) => void
  
  // ========================================
  // AGENT
  // ========================================
  isAgentTyping: boolean
  setIsAgentTyping: (typing: boolean) => void
  
  // ========================================
  // CONVERSATIONS SAUVEGARDÉES
  // ========================================
  savedConversations: SavedConversation[]
  savedConversationsLoading: boolean
  savedConversationsError: Error | null
  
  fetchSavedConversations: () => Promise<void>
  saveConversation: (input: SavedConversationCreate) => Promise<SavedConversation | null>
  deleteSavedConversation: (id: string) => Promise<boolean>
  loadConversation: (conversation: SavedConversation) => void
  clearSavedConversationsError: () => void
  
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
  setMessages: (messages) => set({ messages }),
  
  // ========================================
  // AGENT
  // ========================================
  isAgentTyping: false,
  setIsAgentTyping: (typing) => set({ isAgentTyping: typing }),
  
  // ========================================
  // CONVERSATIONS SAUVEGARDÉES - State
  // ========================================
  savedConversations: [],
  savedConversationsLoading: false,
  savedConversationsError: null,
  
  // ========================================
  // CONVERSATIONS SAUVEGARDÉES - Actions
  // ========================================
  
  fetchSavedConversations: async () => {
    const state = get()
    if (state.savedConversationsLoading) {
      console.log('⚠️ Conversations fetch already in progress')
      return
    }
    
    set({ savedConversationsLoading: true, savedConversationsError: null })
    
    try {
      const { data, error } = await conversationsService.getSavedConversations()
      
      if (error) throw error
      
      set({ savedConversations: data || [], savedConversationsLoading: false })
      console.log('✅ Saved conversations loaded:', data?.length || 0)
    } catch (err) {
      console.error('❌ Fetch conversations error:', err)
      set({ savedConversationsError: err as Error, savedConversationsLoading: false })
    }
  },
  
  saveConversation: async (input) => {
    set({ savedConversationsError: null })
    console.log('💾 Saving conversation:', input.title)
    
    try {
      const { data, error } = await conversationsService.createSavedConversation(input)
      
      if (error) throw error
      
      if (data) {
        set((state) => ({ 
          savedConversations: [data, ...state.savedConversations]
        }))
        console.log('✅ Conversation saved:', data.id)
        return data
      }
      
      return null
    } catch (err) {
      console.error('❌ Save conversation error:', err)
      set({ savedConversationsError: err as Error })
      return null
    }
  },
  
  deleteSavedConversation: async (id) => {
    set({ savedConversationsError: null })
    console.log('🗑️ Deleting conversation:', id)
    
    try {
      const { error } = await conversationsService.deleteSavedConversation(id)
      
      if (error) throw error
      
      set((state) => ({ 
        savedConversations: state.savedConversations.filter(c => c.id !== id) 
      }))
      console.log('✅ Conversation deleted:', id)
      return true
    } catch (err) {
      console.error('❌ Delete conversation error:', err)
      set({ savedConversationsError: err as Error })
      return false
    }
  },
  
  loadConversation: (conversation) => {
    console.log('📂 Loading conversation:', conversation.title)
    // Charger les messages dans le chat
    set({ messages: conversation.messages })
  },
  
  clearSavedConversationsError: () => set({ savedConversationsError: null }),

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
