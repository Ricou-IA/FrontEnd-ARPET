// ============================================================
// ARPET - Supabase Client
// Version: 4.1.0 - Fix ALT+TAB bug (fetch direct pour profile)
// Date: 2025-12-11
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://odspcxgafcqxjzrarsqf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kc3BjeGdhZmNxeGp6cmFyc3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODcwNzUsImV4cCI6MjA3OTE2MzA3NX0.DKCg_EwasSi_SNto8D3rC5H7FaShuUra8cGQ6g9Q58g'
const STORAGE_KEY = 'sb-odspcxgafcqxjzrarsqf-auth-token'

// ============================================================
// SINGLETON
// ============================================================

let supabaseInstance: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    console.log('[Supabase] Creating client instance')
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return supabaseInstance
}

export const supabase = getSupabaseClient()

// ============================================================
// HELPERS - Fetch direct (évite les bugs ALT+TAB)
// ============================================================

/**
 * Récupère le token d'auth depuis localStorage (synchrone, pas de blocage)
 */
function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    
    const parsed = JSON.parse(stored)
    return parsed?.access_token || null
  } catch {
    return null
  }
}

/**
 * Récupère le profil utilisateur via fetch direct
 * Table: core.profiles
 * Note: Utilise fetch direct pour éviter les problèmes de re-render sur ALT+TAB
 */
export async function getProfile(userId: string) {
  try {
    const token = getAuthToken()
    
    // Utiliser l'API REST avec le header Accept-Profile pour cibler le schéma
    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token || supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Accept-Profile': 'core',  // ← Schéma cible
        },
      }
    )

    if (!response.ok) {
      console.error('[Supabase] Profile fetch error:', response.status)
      return null
    }

    const data = await response.json()
    return data?.[0] || null
  } catch (error) {
    console.error('[Supabase] Error fetching profile:', error)
    return null
  }
}

/**
 * Récupère les projets de l'organisation via fetch direct
 * Table: core.projects
 */
export async function getUserProjects(orgId: string) {
  try {
    const token = getAuthToken()
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/projects?org_id=eq.${orgId}&select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token || supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Accept-Profile': 'core',  // ← Schéma cible
        },
      }
    )

    if (!response.ok) {
      console.error('[Supabase] Projects fetch error:', response.status)
      return []
    }

    return await response.json()
  } catch (error) {
    console.error('[Supabase] Error fetching projects:', error)
    return []
  }
}

/**
 * Récupère les projets via project_members
 * Tables: core.project_members, core.projects
 */
export async function getProjectsForUser(userId: string) {
  try {
    const token = getAuthToken()
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/project_members?user_id=eq.${userId}&select=project_id,projects(id,name,org_id,created_at)`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token || supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Accept-Profile': 'core',  // ← Schéma cible
        },
      }
    )

    if (!response.ok) {
      console.error('[Supabase] Project members fetch error:', response.status)
      return []
    }

    const data = await response.json()
    return data?.map((item: { projects: unknown }) => item.projects).filter(Boolean) || []
  } catch (error) {
    console.error('[Supabase] Error fetching user projects:', error)
    return []
  }
}
