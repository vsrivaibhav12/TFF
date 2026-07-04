import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { KeyboardEvent } from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Keyboard handler helper for divs/spans that act as buttons.
 * Triggers the provided callback on Enter or Space.
 */
export function onEnterSpace(handler: () => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };
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

export function formatTimeIST(d: string | Date | null | undefined): string {
  if (!d) return '—';
  let value = d;
  if (typeof value === 'string') {
    // Bare Postgres TIMESTAMP strings have no timezone. Treat them as UTC
    // because the app previously stored check_in/check_out as toISOString().
    const hasOffset = /Z$|[+-]\d{2}:?\d{2}$/.test(value);
    if (!hasOffset) value = `${value}Z`;
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
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
export function dueLabel(due?: string | null): string {
  if (!due) return 'No due date';
  const diff = Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `Due in ${diff} days`;
}

export function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Returns current IST datetime as an ISO string with the +05:30 offset.
 * Use for timestamps that should reflect IST wall-clock time.
 */
export function nowIST(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}+05:30`;
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

export const GSTIN_STATE_MAP = { "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "AR", "13": "NL", "14": "MZ", "15": "TR", "16": "ML", "17": "AS", "18": "WB", "19": "JH", "20": "OR", "21": "CG", "22": "MP", "23": "UP", "24": "GJ", "26": "DD", "27": "MH", "28": "AP", "29": "KA", "30": "GA", "31": "LD", "32": "KL", "33": "TN", "34": "PY", "35": "AN", "36": "TG", "37": "AP", "38": "LA", "97": "OT" };
export function deriveStateFromGstin(gstin: string): string | undefined { const code = gstin?.trim()?.substring(0, 2); return (GSTIN_STATE_MAP as Record<string, string>)[code]; }

/**
 * Uniform task title generator used across ALL task creation paths.
 * Format: {SubService} — {Client} — {Period}
 * Period: MM/YYYY | Q{quarter} {year} | {year}
 */
/**
 * Returns the human-facing task name.
 * Prefer the linked sub-service name; fall back to the first segment of the
 * generated title so that period/client suffixes are not shown.
 */
export function displayTaskName(task?: { sub_services?: { name?: string } | null; title?: string | null } | null): string {
  if (!task) return 'Untitled task';
  if (task.sub_services?.name) return task.sub_services.name;
  if (task.title) return task.title.split(' — ')[0];
  return 'Untitled task';
}

export function buildTaskTitle(opts: {
  subServiceName: string;
  clientName?: string;
  periodYear?: number | null;
  periodMonth?: number | null;
  periodQuarter?: number | null;
}): string {
  const parts: string[] = [opts.subServiceName];
  if (opts.clientName) parts.push(opts.clientName);

  const periodParts: string[] = [];
  if (opts.periodYear) {
    if (opts.periodMonth) {
      periodParts.push(`${opts.periodMonth}/${opts.periodYear}`);
    } else if (opts.periodQuarter) {
      periodParts.push(`Q${opts.periodQuarter} ${opts.periodYear}`);
    } else {
      periodParts.push(String(opts.periodYear));
    }
  }
  if (periodParts.length > 0) parts.push(periodParts.join(' — '));

  return parts.join(' — ');
}
