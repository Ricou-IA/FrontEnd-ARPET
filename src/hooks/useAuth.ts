// ============================================================
// ARPET - useAuth Hook
// Version: 2.1.0 - Fix: Auto-clear corrupted cache
// Date: 2025-01-XX
// ============================================================

import { useEffect, useState, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, getProfile } from '../lib/supabase'
import type { Profile } from '../types'

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
}

// Clé utilisée par Supabase pour stocker la session
const SUPABASE_AUTH_KEY = 'sb-odspcxgafcqxjzrarsqf-auth-token'

/**
 * Vérifie si la session stockée est valide
 * Si corrompue ou expirée, la nettoie automatiquement
 */
function validateAndCleanStoredSession(): boolean {
  try {
    const stored = localStorage.getItem(SUPABASE_AUTH_KEY)
    
    if (!stored) {
      return true // Pas de session, c'est OK
    }

    const parsed = JSON.parse(stored)
    
    // Vérifier la structure minimale
    if (!parsed || typeof parsed !== 'object') {
      console.warn('Auth cache invalid structure, clearing...')
      localStorage.removeItem(SUPABASE_AUTH_KEY)
      return false
    }

    // Vérifier si le token est expiré
    if (parsed.expires_at) {
      const expiresAt = new Date(parsed.expires_at * 1000)
      const now = new Date()
      
      // Si expiré depuis plus de 7 jours, nettoyer
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      if (expiresAt < sevenDaysAgo) {
        console.warn('Auth cache expired, clearing...')
        localStorage.removeItem(SUPABASE_AUTH_KEY)
        return false
      }
    }

    return true
  } catch (error) {
    // JSON invalide ou autre erreur
    console.warn('Auth cache corrupted, clearing...', error)
    localStorage.removeItem(SUPABASE_AUTH_KEY)
    return false
  }
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
  })

  // Ref pour éviter les re-fetch inutiles
  const currentUserIdRef = useRef<string | null>(null)
  const isFetchingProfileRef = useRef(false)
  const initialLoadDoneRef = useRef(false)
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let isMounted = true
    let subscription: { unsubscribe: () => void } | null = null

    // ÉTAPE 1: Valider et nettoyer le cache si nécessaire
    const cacheValid = validateAndCleanStoredSession()
    if (!cacheValid) {
      console.log('Cache was cleaned, proceeding with fresh auth check')
    }

    // Récupérer la session initiale
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!isMounted) return

        // Si erreur de session, nettoyer et redémarrer
        if (error) {
          console.error('Session error, clearing cache:', error)
          localStorage.removeItem(SUPABASE_AUTH_KEY)
          setAuthState({
            user: null,
            profile: null,
            session: null,
            isLoading: false,
          })
          return
        }

        if (session?.user) {
          currentUserIdRef.current = session.user.id
          const profile = await getProfile(session.user.id)
          
          if (!isMounted) return
          
          setAuthState({
            user: session.user,
            profile: profile as Profile | null,
            session,
            isLoading: false,
          })
        } else {
          setAuthState({
            user: null,
            profile: null,
            session: null,
            isLoading: false,
          })
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
        // En cas d'erreur, nettoyer le cache et débloquer
        localStorage.removeItem(SUPABASE_AUTH_KEY)
        if (isMounted) {
          setAuthState(prev => ({ ...prev, isLoading: false }))
        }
      } finally {
        if (isMounted) {
          initialLoadDoneRef.current = true
          // Nettoyer le timeout dès que l'opération est terminée
          if (safetyTimeoutRef.current) {
            clearTimeout(safetyTimeoutRef.current)
            safetyTimeoutRef.current = null
          }
        }
      }
    }

    // Timeout de sécurité : si après 3s on est toujours en loading, on débloque
    // Réduit de 5s à 3s pour une meilleure UX
    safetyTimeoutRef.current = setTimeout(() => {
      if (!initialLoadDoneRef.current && isMounted) {
        console.warn('Auth safety timeout triggered, clearing cache')
        localStorage.removeItem(SUPABASE_AUTH_KEY)
        setAuthState(prev => ({ ...prev, isLoading: false }))
        initialLoadDoneRef.current = true
      }
    }, 3000)

    getInitialSession()

    // Écouter les changements d'auth
    const authStateChangeResult = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        // Ignorer INITIAL_SESSION si on n'a pas encore fini le chargement initial
        // pour éviter les conflits avec getInitialSession
        if (event === 'INITIAL_SESSION') {
          // Si on a déjà fini le chargement initial, on peut ignorer
          if (initialLoadDoneRef.current) {
            return
          }
          // Sinon, on attend que getInitialSession se termine
          // (getInitialSession va gérer cet événement)
          return
        }

        console.log('Auth event:', event)

        // Nettoyer le timeout dès qu'on reçoit un événement d'auth
        if (safetyTimeoutRef.current) {
          clearTimeout(safetyTimeoutRef.current)
          safetyTimeoutRef.current = null
        }

        // S'assurer que le chargement initial est terminé avant de traiter les autres événements
        if (!initialLoadDoneRef.current) {
          // Attendre un peu que getInitialSession se termine
          await new Promise(resolve => setTimeout(resolve, 100))
          if (!isMounted) return
        }

        // Ignorer les événements de refresh token
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed, updating session only')
          setAuthState(prev => ({
            ...prev,
            session: session,
            isLoading: false,
          }))
          return
        }

        // Si c'est le même utilisateur, ne pas re-fetch le profil
        if (session?.user && session.user.id === currentUserIdRef.current) {
          console.log('Same user, skipping profile fetch')
          setAuthState(prev => ({
            ...prev,
            session: session,
            isLoading: false,
          }))
          return
        }

        // Éviter les fetch parallèles mais quand même débloquer le loading
        if (isFetchingProfileRef.current) {
          console.log('Already fetching profile, skipping but ensuring not loading')
          setAuthState(prev => ({ ...prev, isLoading: false }))
          return
        }
        
        if (session?.user) {
          isFetchingProfileRef.current = true
          currentUserIdRef.current = session.user.id
          
          try {
            const profile = await getProfile(session.user.id)
            
            if (!isMounted) return
            
            setAuthState({
              user: session.user,
              profile: profile as Profile | null,
              session,
              isLoading: false,
            })
          } catch (error) {
            console.error('Error fetching profile:', error)
            // Même en erreur, on débloque
            if (isMounted) {
              setAuthState(prev => ({ ...prev, isLoading: false }))
            }
          } finally {
            isFetchingProfileRef.current = false
          }
        } else {
          currentUserIdRef.current = null
          if (isMounted) {
            setAuthState({
              user: null,
              profile: null,
              session: null,
              isLoading: false,
            })
          }
        }
      }
    )

    // Stocker la subscription de manière sécurisée
    if (authStateChangeResult?.data?.subscription) {
      subscription = authStateChangeResult.data.subscription
    }

    return () => {
      isMounted = false
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current)
        safetyTimeoutRef.current = null
      }
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe()
      }
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    return data
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    
    if (error) throw error
    return data
  }

  const signOut = async () => {
    // Nettoyer le cache local avant la déconnexion
    localStorage.removeItem(SUPABASE_AUTH_KEY)
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
  }
}
