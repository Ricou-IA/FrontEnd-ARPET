// ============================================
// UTILISATEUR & AUTH
// ============================================

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  org_id?: string;
  app_id?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  business_role: string;
  app_role: string;
  org_id: string;
  app_id: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}
