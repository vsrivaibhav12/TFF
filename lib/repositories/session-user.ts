import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { AppUser } from '@/lib/auth/require-role';

/**
 * Looks up the signed-in user from the session cookies. Not cached here: lib/auth/current-user.ts wraps it in
 * React's per-request cache so the layout and the page of one request share a single lookup.
 */
export async function loadSessionUser(): Promise<AppUser | null> {
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
