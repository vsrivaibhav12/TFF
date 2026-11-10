import { timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

/**
 * Authorise a cron request.
 *
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when the CRON_SECRET
 * environment variable is set. The old `x-vercel-cron` header is NOT proof of
 * anything: any caller can add it. For manual runs use the same bearer header.
 * The secret is deliberately not accepted in the query string (URLs are logged).
 */
export function isAuthorizedCron(request: NextRequest | Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed when not configured

  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
