import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Auth + role-prefix middleware.
 *
 * - Logged-out users hitting any protected prefix → /login
 * - Logged-in users hitting /login → / (home, then role-routed)
 * - Logged-in users hitting a prefix that doesn't match their role →
 *   redirected straight to their own home. This is the fix for the
 *   "one click → flicker into the wrong section" UX bug.
 *
 * `requireRole(...)` on each layout is still the canonical security check;
 * middleware here is defense-in-depth + UX (no wrong-layout flicker).
 */

const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  team: '/team',
};

const ROLE_ALLOWED_PREFIX: Record<string, string[]> = {
  admin: ['/admin', '/team'],
  team: ['/team'],
};

// Paths anyone authenticated may hit (account-self, legal, /api/cmdk for search, etc.)
const ROLE_NEUTRAL_PREFIXES = ['/account', '/legal', '/api/cmdk', '/api/notifications', '/api/sub-services'];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: keep an auth call here. It refreshes an expiring session cookie.
  // getClaims() does that too but verifies the token locally against the project's
  // public key (ES256) instead of calling the Auth server on every request, which
  // removes one network round trip from every page load. It falls back to getUser().
  type MiddlewareUser = { id: string; user_metadata?: Record<string, unknown> };
  let user: MiddlewareUser | null = null;
  try {
    const { data: claims } = await supabase.auth.getClaims();
    const sub = claims?.claims?.sub as string | undefined;
    if (sub) {
      user = { id: sub, user_metadata: (claims?.claims?.user_metadata as Record<string, unknown> | undefined) ?? {} };
    }
  } catch {
    user = null;
  }
  if (!user) {
    const {
      data: { user: fetched },
    } = await supabase.auth.getUser();
    user = fetched ? { id: fetched.id, user_metadata: fetched.user_metadata } : null;
  }

  const path = request.nextUrl.pathname;
  const protectedPrefixes = ['/team', '/admin'];
  const matchedProtected = protectedPrefixes.find((p) => path === p || path.startsWith(p + '/'));

  // 1) Not logged in → /login
  if (matchedProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  // 2) Logged in but hitting /login → redirect straight to their dashboard.
  //    The role comes from the database profile, never from user_metadata:
  //    users can edit their own metadata, and a deactivated user whose metadata
  //    still says "admin" would otherwise bounce between /login and /admin forever.
  if (path === '/login' && user) {
    const { data: profile } = await supabase
      .from('users_profile')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle();
    const role = profile?.role as string | undefined;
    if (!profile || profile.is_active === false || !role) {
      // Do not redirect again: show the login page so they can sign out / switch account.
      if (request.nextUrl.searchParams.get('reason') === 'inactive') return supabaseResponse;
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('reason', 'inactive');
      return NextResponse.redirect(url);
    }
    // Client accounts have no workspace: leave them on the login page.
    if (!ROLE_HOME[role]) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[role];
    url.search = '';
    return NextResponse.redirect(url);
  }

  // 3) Logged in + hitting a protected prefix → ensure prefix matches role
  if (matchedProtected && user) {
    // Role-neutral paths (like /account) bypass the role-prefix check entirely
    const isNeutral = ROLE_NEUTRAL_PREFIXES.some((p) => path.startsWith(p));
    if (!isNeutral) {
      // H-11: Try JWT user_metadata first to avoid a second DB call. This is routing
      // convenience only (it picks the right section). user_metadata is editable by
      // the user, so every layout re-checks the real role with requireRole().
      let role = user.user_metadata?.role as string | undefined;
      let isActive = true;

      // Fallback to DB if JWT metadata is missing (legacy users or metadata not set)
      if (!role) {
        const { data: profile } = await supabase
          .from('users_profile')
          .select('role, is_active')
          .eq('id', user.id)
          .maybeSingle();
        role = profile?.role as string | undefined;
        isActive = profile?.is_active !== false;

        // Inactive or no profile → bounce to /login
        if (!profile || !isActive || !role) {
          const url = request.nextUrl.clone();
          url.pathname = '/login';
          url.searchParams.set('reason', 'inactive');
          return NextResponse.redirect(url);
        }
      }

      const allowedPrefixes = ROLE_ALLOWED_PREFIX[role] ?? [];
      const home = ROLE_HOME[role] ?? '/';
      if (allowedPrefixes.length > 0 && !allowedPrefixes.includes(matchedProtected)) {
        const url = request.nextUrl.clone();
        url.pathname = home;
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
