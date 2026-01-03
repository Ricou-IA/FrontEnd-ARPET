import { StateCreator } from 'zustand'
import { ViewerDocument } from '../../types'
import { AppState } from '../appStore'

export interface ViewerSlice {
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

export const createViewerSlice: StateCreator<AppState, [], [], ViewerSlice> = (set, get) => ({
    viewerOpen: false,
    viewerDocument: null,
    viewerCurrentPage: 1,
    viewerTotalPages: 1,
    viewerZoom: 1,
    viewerLoading: false,

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
})
