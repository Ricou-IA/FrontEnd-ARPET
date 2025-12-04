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

    // Récupérer la session initiale
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!isMounted) return

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

    // Timeout de sécurité : si après 5s on est toujours en loading, on débloque
    safetyTimeoutRef.current = setTimeout(() => {
      if (!initialLoadDoneRef.current && isMounted) {
        console.warn('Auth safety timeout triggered')
        setAuthState(prev => ({ ...prev, isLoading: false }))
        initialLoadDoneRef.current = true
      }
    }, 5000)

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
