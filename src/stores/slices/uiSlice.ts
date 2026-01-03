import { StateCreator } from 'zustand'
import { Project } from '../../types'
import { AppState } from '../appStore'

export interface UiSlice {
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
}

export const createUiSlice: StateCreator<AppState, [], [], UiSlice> = (set, get) => ({
    sidebarOpen: true,
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    activeProject: null,
    setActiveProject: (project) => {
        set({
            activeProject: project,
            // Reset conversation quand on change de projet
            currentConversationId: null,
        })
        // Recalculer les counts quand le projet change
        get().fetchDocumentsCounts()
        // Recharger les conversations sauvegardées du nouveau projet
        get().fetchSavedConversations()
    },
})
