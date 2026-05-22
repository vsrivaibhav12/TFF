/**
 * Simple in-memory rate limiter for Server Actions.
 * R-3: Prevents abuse of write endpoints (leave requests, queries, etc.)
 *
 * Uses a sliding window approach with per-user tracking.
 * Note: This is per-process — in a multi-instance deployment (Vercel),
 * each serverless function gets its own window. This is acceptable for
 * basic abuse prevention; for strict rate limiting, use Redis or Upstash.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

/**
 * Check if a request should be rate-limited.
 *
 * @param key Unique identifier (typically `${action}:${userId}`)
 * @param maxRequests Maximum number of requests allowed in the window
 * @param windowMs Time window in milliseconds (default: 60 seconds)
 * @returns `{ limited: false }` if allowed, `{ limited: true, retryAfterMs }` if blocked
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = 60_000,
): { limited: false } | { limited: true; retryAfterMs: number } {
  cleanup(windowMs);
  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    return { limited: true, retryAfterMs };
  }

  entry.timestamps.push(now);
  return { limited: false };
}
