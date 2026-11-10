import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type AppRole = 'admin' | 'team';

export interface AppUser {
  id: string;
  email: string;
  role: AppRole;
  full_name: string | null;
  is_active: boolean;
  is_prime_admin?: boolean;
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = createClient();

  // getClaims() verifies the signed login token locally against the project's public
  // key, so it costs no network round trip (getUser() asks the Auth server every time).
  // This project signs tokens with an asymmetric key (ES256), which makes that possible.
  // The profile query below still runs on every call, so a deactivated user is locked
  // out immediately even though their token is technically still valid.
  let userId: string | null = null;
  try {
    const { data: claims } = await supabase.auth.getClaims();
    userId = (claims?.claims?.sub as string | undefined) ?? null;
  } catch {
    userId = null;
  }
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }
  if (!userId) return null;

  // users_profile.id IS auth.users.id (per schema v3)
  const { data: profile } = await supabase
    .from('users_profile')
    .select('id, email, role, full_name, is_active, is_prime_admin')
    .eq('id', userId)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;
  return profile as AppUser;
}

export async function requireUser(): Promise<AppUser> {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  return u;
}

export async function requireRole(allowed: AppRole | AppRole[]): Promise<AppUser> {
  const user = await requireUser();
  const allowedArr = Array.isArray(allowed) ? allowed : [allowed];
  if (!allowedArr.includes(user.role)) {
    redirect(`/${user.role}`);
  }
  return user;
}
