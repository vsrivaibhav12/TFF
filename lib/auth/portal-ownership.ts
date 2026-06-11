import 'server-only';
import { createClient } from '@/lib/supabase/server';

/**
 * Verifies that the currently authenticated client user is linked to
 * the given client_id. This is defense-in-depth on top of RLS.
 */
export async function verifyClientOwnership(clientId: string): Promise<boolean> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;

  const { data } = await sb
    .from('client_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('client_id', clientId)
    .eq('is_active', true)
    .single();

  return !!data;
}

/**
 * Asserts client ownership; throws if the user is not linked.
 * Use in page components with notFound() on failure.
 */
export async function requireClientOwnership(clientId: string): Promise<void> {
  const ok = await verifyClientOwnership(clientId);
  if (!ok) {
    const err = new Error('UNAUTHORIZED');
    (err as unknown as Record<string, string>).code = 'PORTAL_OWNERSHIP_DENIED';
    throw err;
  }
}
