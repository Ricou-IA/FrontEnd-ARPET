import { StateCreator } from 'zustand'
import { supabase } from '../../lib/supabase'
import { Message, SavedConversation, SavedConversationCreate } from '../../types'
import * as conversationsService from '../../services/conversations.service'
import { AppState } from '../appStore'

export interface ChatSlice {
    // ========================================
    // CHAT (volatile)
    // ========================================
    messages: Message[]
    addMessage: (message: Message) => void
    clearMessages: () => Promise<void>
    setMessages: (messages: Message[]) => void

    // ========================================
    // CONVERSATION RAG (mémoire IA)
    // ========================================
    currentConversationId: string | null
    setCurrentConversationId: (id: string | null) => void

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
}

export const createChatSlice: StateCreator<AppState, [], [], ChatSlice> = (set, get) => ({
    messages: [],
    addMessage: (message) => set((state) => ({
        messages: [...state.messages, message]
    })),

    clearMessages: async () => {
        const currentConvId = get().currentConversationId

        // Fermer la conversation RAG active si elle existe
        if (currentConvId) {
            console.log('🔒 Closing RAG conversation on clear:', currentConvId)
            try {
                await supabase.schema('rag').rpc('close_conversation', {
                    p_conversation_id: currentConvId
                })
                console.log('✅ RAG conversation closed')
            } catch (e) {
                console.error('❌ Error closing RAG conversation:', e)
            }
        }

        set({
            messages: [],
            currentConversationId: null,
        })
    },

    setMessages: (messages) => set({ messages }),

    currentConversationId: null,
    setCurrentConversationId: (id) => set({ currentConversationId: id }),

    isAgentTyping: false,
    setIsAgentTyping: (typing) => set({ isAgentTyping: typing }),

    savedConversations: [],
    savedConversationsLoading: false,
    savedConversationsError: null,

    fetchSavedConversations: async () => {
        const state = get()
        if (state.savedConversationsLoading) {
            console.log('⚠️ Conversations fetch already in progress')
            return
        }

        set({ savedConversationsLoading: true, savedConversationsError: null })

        try {
            // Filtrer par projet actif (isolation par chantier)
            const projectId = state.activeProject?.id || null
            const { data, error } = await conversationsService.getSavedConversations(projectId)

            if (error) throw error

            set({ savedConversations: data || [], savedConversationsLoading: false })
            console.log('✅ Saved conversations loaded:', data?.length || 0, 'for project:', projectId || 'none')
        } catch (err) {
            console.error('❌ Fetch conversations error:', err)
            set({ savedConversationsError: err as Error, savedConversationsLoading: false })
        }
    },

    saveConversation: async (input) => {
        set({ savedConversationsError: null })
        console.log('💾 Saving conversation:', input.title)

        try {
            const currentConvId = get().currentConversationId

            // Sauvegarder avec le rag_conversation_id pour conserver le lien
            const { data, error } = await conversationsService.createSavedConversation({
                ...input,
                rag_conversation_id: currentConvId,
            })

            if (error) throw error

            if (data) {
                // Fermer la conversation RAG (mais ne pas la supprimer)
                if (currentConvId) {
                    console.log('🔒 Closing RAG conversation after save:', currentConvId)
                    try {
                        await supabase.schema('rag').rpc('close_conversation', {
                            p_conversation_id: currentConvId
                        })
                        console.log('✅ RAG conversation closed after save')
                    } catch (e) {
                        console.error('❌ Error closing RAG conversation:', e)
                    }
                }

                set((state) => ({
                    savedConversations: [data, ...state.savedConversations],
                    // Reset pour nouvelle conversation
                    currentConversationId: null,
                }))
                console.log('✅ Conversation saved:', data.id, 'with rag_id:', currentConvId)
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
            // Trouver la conversation pour récupérer le rag_conversation_id
            const conversation = get().savedConversations.find(c => c.id === id)
            const ragConversationId = conversation?.rag_conversation_id || null

            const { error } = await conversationsService.deleteSavedConversation(id, ragConversationId)

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

        // Récupérer le rag_conversation_id si présent
        const ragConversationId = conversation.rag_conversation_id || null

        console.log('📂 Restoring RAG conversation ID:', ragConversationId || 'none')

        set({
            messages: conversation.messages,
            // Restaurer le currentConversationId pour retrouver le contexte RAG
            currentConversationId: ragConversationId,
        })
    },

    clearSavedConversationsError: () => set({ savedConversationsError: null }),
})
