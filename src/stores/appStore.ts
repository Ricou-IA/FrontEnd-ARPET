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
