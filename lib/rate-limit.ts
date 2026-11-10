import 'server-only';
import { createServiceClient } from '@/lib/supabase/service-role';

/**
 * Rate limiter shared by every server instance.
 *
 * Counters live in the database (public.rate_limit_counters, function
 * public.check_rate_limit), so a limit holds no matter which Vercel instance
 * serves the request. If the database cannot be reached the limiter falls back
 * to an in-memory counter for that instance instead of blocking everybody.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface Options {
  maxRequests: number;
  windowMs: number;
}

const DEFAULTS: Options = { maxRequests: 10, windowMs: 60_000 };

// ---- fallback (per instance) ----------------------------------------------
const memory = new Map<string, { count: number; resetAt: number }>();

function memoryCheck(key: string, opts: Options): RateLimitResult {
  const now = Date.now();
  for (const [k, v] of memory) if (v.resetAt < now) memory.delete(k);
  const entry = memory.get(key);
  if (!entry || entry.resetAt < now) {
    const resetAt = now + opts.windowMs;
    memory.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: opts.maxRequests - 1, resetAt };
  }
  if (entry.count >= opts.maxRequests) return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  entry.count++;
  return { allowed: true, remaining: opts.maxRequests - entry.count, resetAt: entry.resetAt };
}

/** Returns whether the call is allowed. Call before a sensitive operation. */
export async function checkRateLimit(key: string, opts: Options = DEFAULTS): Promise<RateLimitResult> {
  try {
    const sb = createServiceClient();
    const { data, error } = await sb.rpc('check_rate_limit', {
      p_key: key,
      p_max: opts.maxRequests,
      p_window_seconds: Math.max(1, Math.round(opts.windowMs / 1000)),
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('empty rate limit response');
    return {
      allowed: !!row.allowed,
      remaining: Number(row.remaining ?? 0),
      resetAt: new Date(row.reset_at).getTime(),
    };
  } catch (e) {
    console.error('[rate-limit] database limiter unavailable, using per-instance fallback', e);
    return memoryCheck(key, opts);
  }
}

/** Rate-limit by IP + path for API routes. */
export function rateLimitByIp(ip: string, path: string, opts?: Options) {
  return checkRateLimit(`ip:${ip}:${path}`, opts);
}

/** Rate-limit by user (or any identifier such as an email) for Server Actions. */
export function rateLimitByUser(userId: string, action: string, opts?: Options) {
  return checkRateLimit(`user:${userId}:${action}`, opts);
}
