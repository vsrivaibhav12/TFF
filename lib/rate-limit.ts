/**
 * Simple in-memory rate limiter.
 * For multi-instance deployments (Vercel), replace with Redis/Upstash.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

function now() {
  return Date.now();
}

function cleanup() {
  const t = now();
  for (const [key, entry] of store) {
    if (entry.resetAt < t) store.delete(key);
  }
}

/** Call this before sensitive operations. Returns true if allowed. */
export function checkRateLimit(
  key: string,
  opts: { maxRequests: number; windowMs: number } = { maxRequests: 10, windowMs: 60_000 }
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();
  const t = now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < t) {
    const resetAt = t + opts.windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: opts.maxRequests - 1, resetAt };
  }

  if (entry.count >= opts.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: opts.maxRequests - entry.count, resetAt: entry.resetAt };
}

/** Rate-limit by IP + path for API routes. */
export function rateLimitByIp(
  ip: string,
  path: string,
  opts?: { maxRequests: number; windowMs: number }
) {
  return checkRateLimit(`ip:${ip}:${path}`, opts);
}

/** Rate-limit by user ID for Server Actions. */
export function rateLimitByUser(
  userId: string,
  action: string,
  opts?: { maxRequests: number; windowMs: number }
) {
  return checkRateLimit(`user:${userId}:${action}`, opts);
}
