import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://odspcxgafcqxjzrarsqf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kc3BjeGdhZmNxeGp6cmFyc3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODcwNzUsImV4cCI6MjA3OTE2MzA3NX0.DKCg_EwasSi_SNto8D3rC5H7FaShuUra8cGQ6g9Q58g'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper pour récupérer le profil utilisateur
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }
  return data
}

// Helper pour récupérer les projets (chantiers) de l'utilisateur
export async function getUserProjects(orgId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching projects:', error)
    return []
  }
  return data
}

// Helper pour récupérer les projets via project_members
export async function getProjectsForUser(userId: string) {
  const { data, error } = await supabase
    .from('project_members')
    .select(`
      project_id,
      projects (
        id,
        name,
        org_id,
        created_at
      )
    `)
    .eq('user_id', userId)
  
  if (error) {
    console.error('Error fetching user projects:', error)
    return []
  }
  
  // Extraire les projets de la réponse
  return data?.map(item => item.projects).filter(Boolean) || []
}
