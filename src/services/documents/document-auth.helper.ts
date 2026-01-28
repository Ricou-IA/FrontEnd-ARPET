// ============================================================
// Document Auth Helper
// Fonctions utilitaires d'authentification pour les services documents
// ============================================================

import { supabase } from '@/lib/supabase';

// ============================================================
// TYPES
// ============================================================

export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

export interface UserProfile {
  id: string;
  app_id: string | null;
  org_id: string | null;
}

// ============================================================
// HELPER: Récupérer le profil utilisateur courant
// ============================================================

export async function getCurrentProfile(): Promise<UserProfile> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const { data: profile, error: profileError } = await supabase
    .schema('core')
    .from('profiles')
    .select('id, app_id, org_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Profile not found');
  }

  return profile;
}
