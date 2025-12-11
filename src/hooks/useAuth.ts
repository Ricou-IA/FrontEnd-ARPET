// ============================================================
// ARPET - useAuth Hook
// Version: 4.0.0 - Compatible migration schémas
// Date: 2025-12-11
// ============================================================

import { useCallback, useSyncExternalStore } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, getProfile } from '../lib/supabase'
import type { Profile } from '../types'

// ============================================================
// AUTH STORE - Singleton hors React
// ============================================================

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
}

// State global
let authState: AuthState = {
  user: null,
  profile: null,
  session: null,
  isLoading: true,
}

const listeners: Set<() => void> = new Set()
let isInitialized = false

function notifyListeners() {
  listeners.forEach(listener => listener())
}

function setAuthState(newState: Partial<AuthState>) {
  authState = { ...authState, ...newState }
  notifyListeners()
}

// ============================================================
// INIT - Appelé une seule fois au chargement du module
// ============================================================

function initAuth() {
  if (isInitialized) return
  isInitialized = true
  
  console.log('[AuthStore] Init')

  // Écouter les changements d'auth
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[AuthStore] Event:', event)

    if (!session) {
      setAuthState({
        user: null,
        profile: null,
        session: null,
        isLoading: false,
      })
      return
    }

    // Session présente
    setAuthState({
      user: session.user,
      session,
      isLoading: true, // Loading pendant qu'on charge le profil
    })

    // Charger le profil
    try {
      console.log('[AuthStore] Loading profile...')
      const profile = await getProfile(session.user.id)
      console.log('[AuthStore] Profile loaded:', profile?.full_name || 'null')
      
      setAuthState({
        profile: profile as Profile | null,
        isLoading: false,
      })
    } catch (error) {
      console.error('[AuthStore] Profile error:', error)
      setAuthState({
        profile: null,
        isLoading: false,
      })
    }
  })
}

// Initialiser immédiatement au chargement du module
initAuth()

// ============================================================
// HOOK useAuth - Utilise useSyncExternalStore pour React 18
// ============================================================

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function getSnapshot(): AuthState {
  return authState
}

export function useAuth() {
  // useSyncExternalStore est conçu pour ce cas d'usage
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
    return data
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  return {
    ...state,
    signIn,
    signUp,
    signOut,
  }
}
