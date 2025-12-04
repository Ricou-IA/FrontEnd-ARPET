import { useEffect, useState } from 'react'
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

  useEffect(() => {
    // Récupérer la session initiale
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const profile = await getProfile(session.user.id)
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
    }

    getInitialSession()

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        
        if (session?.user) {
          const profile = await getProfile(session.user.id)
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
      }
    )

    return () => {
      subscription.unsubscribe()
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
