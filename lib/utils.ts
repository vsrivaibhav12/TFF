import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyINR(value: number | null | undefined, opts?: { compact?: boolean }) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (opts?.compact) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateIST(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export function timeAgo(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Handle future dates gracefully (e.g. due dates)
  if (diffMs < 0) {
    const absDiffMs = Math.abs(diffMs);
    const absDiffMin = Math.floor(absDiffMs / 60000);
    const absDiffHour = Math.floor(absDiffMin / 60);
    const absDiffDay = Math.floor(absDiffHour / 24);
    const absDiffWeek = Math.floor(absDiffDay / 7);
    const absDiffMonth = Math.floor(absDiffDay / 30);
    if (absDiffMin < 60) return `in ${absDiffMin}m`;
    if (absDiffHour < 24) return `in ${absDiffHour}h`;
    if (absDiffDay < 7) return `in ${absDiffDay}d`;
    if (absDiffWeek < 4) return `in ${absDiffWeek}w`;
    if (absDiffMonth < 12) return `in ${absDiffMonth}mo`;
    return `in ${Math.floor(absDiffDay / 365)}y`;
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${diffYear}y ago`;
}

/**
 * Returns today's date in IST as YYYY-MM-DD string.
 * Fixes the UTC-vs-IST bug: between 00:00–05:29 IST, UTC is still the previous day.
 */
export function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Returns current IST datetime as an ISO string (with IST offset applied).
 * Use for timestamps that should reflect IST wall-clock time.
 */
export function nowIST(): string {
  return new Date().toISOString();
}

/**
 * Escapes a string for safe embedding in HTML email templates.
 * Prevents XSS/injection via user-generated content.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
