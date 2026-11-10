/**
 * Date ranges for reports. Pure functions on ISO dates (YYYY-MM-DD), no time zone maths:
 * callers pass "today" in IST, so every range lines up with the firm's calendar.
 */

export type RangePresetKey =
  | 'today'
  | 'last7'
  | 'last30'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_fy'
  | 'last_fy';

export const RANGE_PRESETS: { key: RangePresetKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'this_quarter', label: 'This quarter' },
  { key: 'this_fy', label: 'This financial year' },
  { key: 'last_fy', label: 'Last financial year' },
];

/** The longest span a report may cover. Keeps queries and exports bounded. */
export const MAX_RANGE_DAYS = 400;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(v: string | undefined | null): v is string {
  if (!v || !ISO.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function utc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

export function daysBetween(fromIso: string, toIsoDate: string): number {
  return Math.round((utc(toIsoDate).getTime() - utc(fromIso).getTime()) / 86_400_000);
}

function monthStart(year: number, month0: number) {
  return toIso(new Date(Date.UTC(year, month0, 1)));
}

function monthEnd(year: number, month0: number) {
  return toIso(new Date(Date.UTC(year, month0 + 1, 0)));
}

/** Indian financial year: 1 April to 31 March. */
function fyStartYear(todayIso: string): number {
  const d = utc(todayIso);
  return d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}

export function rangeForPreset(key: RangePresetKey, todayIso: string): { from: string; to: string } {
  const t = utc(todayIso);
  const y = t.getUTCFullYear();
  const m = t.getUTCMonth();
  switch (key) {
    case 'today':
      return { from: todayIso, to: todayIso };
    case 'last7':
      return { from: addDays(todayIso, -6), to: todayIso };
    case 'last30':
      return { from: addDays(todayIso, -29), to: todayIso };
    case 'this_month':
      return { from: monthStart(y, m), to: monthEnd(y, m) };
    case 'last_month':
      return { from: monthStart(y, m - 1), to: monthEnd(y, m - 1) };
    case 'this_quarter': {
      const q = Math.floor(m / 3) * 3;
      return { from: monthStart(y, q), to: monthEnd(y, q + 2) };
    }
    case 'this_fy': {
      const s = fyStartYear(todayIso);
      return { from: `${s}-04-01`, to: `${s + 1}-03-31` };
    }
    case 'last_fy': {
      const s = fyStartYear(todayIso) - 1;
      return { from: `${s}-04-01`, to: `${s + 1}-03-31` };
    }
  }
}

export interface ResolvedRange {
  from: string;
  to: string;
  preset: RangePresetKey | 'custom';
  /** True when a custom range was longer than MAX_RANGE_DAYS and was shortened. */
  clamped: boolean;
}

/**
 * Work out the range from URL params. A valid `from` and `to` win (custom range, swapped if
 * reversed, shortened if too long); otherwise a known `range` preset; otherwise the default.
 */
export function resolveRange(
  params: { from?: string; to?: string; range?: string },
  todayIso: string,
  defaultPreset: RangePresetKey = 'this_month',
): ResolvedRange {
  if (isIsoDate(params.from) && isIsoDate(params.to)) {
    let from = params.from;
    let to = params.to;
    if (from > to) [from, to] = [to, from];
    let clamped = false;
    if (daysBetween(from, to) + 1 > MAX_RANGE_DAYS) {
      from = addDays(to, -(MAX_RANGE_DAYS - 1));
      clamped = true;
    }
    return { from, to, preset: 'custom', clamped };
  }
  const key = RANGE_PRESETS.find((p) => p.key === params.range)?.key ?? defaultPreset;
  return { ...rangeForPreset(key, todayIso), preset: key, clamped: false };
}

/**
 * The firm's working days in a range: Monday to Saturday, never later than `upTo`
 * (normally today). Sundays are treated as the weekly off.
 */
export function workingDays(fromIso: string, toIsoDate: string, upTo?: string): string[] {
  const end = upTo && upTo < toIsoDate ? upTo : toIsoDate;
  const out: string[] = [];
  for (let d = fromIso; d <= end; d = addDays(d, 1)) {
    if (utc(d).getUTCDay() !== 0) out.push(d);
  }
  return out;
}

/** Every calendar day in a range, oldest first. */
export function eachDay(fromIso: string, toIsoDate: string): string[] {
  const out: string[] = [];
  for (let d = fromIso; d <= toIsoDate; d = addDays(d, 1)) out.push(d);
  return out;
}

/** "1 Apr 2026 to 30 Apr 2026" style label. */
export function formatRangeLabel(fromIso: string, toIsoDate: string): string {
  const f = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return fromIso === toIsoDate ? f.format(utc(fromIso)) : `${f.format(utc(fromIso))} to ${f.format(utc(toIsoDate))}`;
}
