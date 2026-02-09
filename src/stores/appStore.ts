// ============================================================
// ARPET - App Store (Zustand)
// Version: 6.0.0 - Architecture Slicing
// Date: 2026-01-03
// ============================================================

import { create } from 'zustand'
import { UiSlice, createUiSlice } from './slices/uiSlice'
import { ChatSlice, createChatSlice } from './slices/chatSlice'
import { DocumentSlice, createDocumentSlice } from './slices/documentSlice'
import { ViewerSlice, createViewerSlice } from './slices/viewerSlice'

// Type de l'état global (Intersection des slices)
export type AppState = UiSlice & ChatSlice & DocumentSlice & ViewerSlice

export const useAppStore = create<AppState>()((...a) => ({
  ...createUiSlice(...a),
  ...createChatSlice(...a),
  ...createDocumentSlice(...a),
  ...createViewerSlice(...a),
}))

// Reset complet du store (changement d'utilisateur / logout)
export function resetAppStore() {
  useAppStore.setState({
    // UiSlice
    sidebarOpen: true,
    activeProject: null,
    // ChatSlice
    messages: [],
    currentConversationId: null,
    isAgentTyping: false,
    savedConversations: [],
    savedConversationsLoading: false,
    savedConversationsError: null,
    // DocumentSlice
    documents: [],
    documentsLoading: false,
    documentsError: null,
    documentsActiveLayer: 'app',
    documentsActiveCategory: null,
    documentsCounts: { app: 0, org: 0, project: 0, user: 0 },
    availableCategories: [],
    categoriesLoading: false,
    userProjects: [],
    userProjectsLoading: false,
    // ViewerSlice
    viewerOpen: false,
    viewerDocument: null,
    viewerCurrentPage: 1,
    viewerTotalPages: 1,
    viewerZoom: 1,
    viewerLoading: false,
  })
}
