// Period model shared by tasks, compliance and the UI. Pure code: no server or client imports.
//
// Indian financial year runs April to March. Quarters are fiscal (Q1 = Apr-Jun).
// Every period has a canonical key:
//   monthly      2026-10          (October 2026)
//   quarterly    FY2026-27-Q2     (Jul-Sep 2026)
//   half_yearly  FY2026-27-H1     (Apr-Sep 2026)
//   yearly       FY2026-27        (Apr 2026 - Mar 2027)
// For quarterly, half-yearly and yearly periods the legacy `period_year` column holds the
// financial-year start year (2026 for FY 2026-27).

export type PeriodType = 'none' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
/** What a sub-service declares. `gst_frequency` resolves per client to monthly or quarterly. */
export type SubServicePeriodType = PeriodType | 'gst_frequency';

export const SUB_SERVICE_PERIOD_TYPES: readonly SubServicePeriodType[] = [
  'none', 'monthly', 'quarterly', 'half_yearly', 'yearly', 'gst_frequency',
];

export const PERIOD_TYPE_LABELS: Record<SubServicePeriodType, string> = {
  none: 'No period',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half-yearly',
  yearly: 'Yearly (financial year)',
  gst_frequency: 'Monthly or quarterly, by client GST frequency',
};

export type Period = {
  type: PeriodType;
  key: string | null;
  year: number | null;
  month: number | null;
  quarter: number | null;
  half: number | null;
};

export type PeriodColumns = {
  period_type: PeriodType;
  period_key: string | null;
  period_year: number | null;
  period_month: number | null;
  period_quarter: number | null;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTER_RANGES = ['Apr-Jun', 'Jul-Sep', 'Oct-Dec', 'Jan-Mar'];

const pad2 = (n: number) => String(n).padStart(2, '0');

export function fyStartYear(year: number, month: number): number {
  return month >= 4 ? year : year - 1;
}

function fyEndSuffix(startYear: number): string {
  return pad2((startYear + 1) % 100);
}

export function fyLabel(startYear: number): string {
  return `FY ${startYear}-${fyEndSuffix(startYear)}`;
}

function fyKey(startYear: number): string {
  return `FY${startYear}-${fyEndSuffix(startYear)}`;
}

export function fiscalQuarterOfMonth(month: number): number {
  return Math.floor(((month - 4 + 12) % 12) / 3) + 1;
}

export const NO_PERIOD: Period = { type: 'none', key: null, year: null, month: null, quarter: null, half: null };

export function makeMonthly(year: number, month: number): Period {
  return { type: 'monthly', key: `${year}-${pad2(month)}`, year, month, quarter: null, half: null };
}
export function makeQuarterly(fyStart: number, quarter: number): Period {
  return { type: 'quarterly', key: `${fyKey(fyStart)}-Q${quarter}`, year: fyStart, month: null, quarter, half: null };
}
export function makeHalfYearly(fyStart: number, half: number): Period {
  return { type: 'half_yearly', key: `${fyKey(fyStart)}-H${half}`, year: fyStart, month: null, quarter: null, half };
}
export function makeYearly(fyStart: number): Period {
  return { type: 'yearly', key: fyKey(fyStart), year: fyStart, month: null, quarter: null, half: null };
}

export function parsePeriodKey(key: string): Period | null {
  let m = /^(\d{4})-(\d{2})$/.exec(key);
  if (m) {
    const month = Number(m[2]);
    return month >= 1 && month <= 12 ? makeMonthly(Number(m[1]), month) : null;
  }
  m = /^FY(\d{4})-(\d{2})(?:-(Q|H)([1-9]))?$/.exec(key);
  if (!m) return null;
  const start = Number(m[1]);
  if (m[2] !== fyEndSuffix(start)) return null;
  if (!m[3]) return makeYearly(start);
  const n = Number(m[4]);
  if (m[3] === 'Q') return n >= 1 && n <= 4 ? makeQuarterly(start, n) : null;
  return n >= 1 && n <= 2 ? makeHalfYearly(start, n) : null;
}

export function formatPeriod(p: Period): string {
  switch (p.type) {
    case 'monthly': return `${MONTHS[(p.month as number) - 1]} ${p.year}`;
    case 'quarterly': return `Q${p.quarter} ${fyLabel(p.year as number)}`;
    case 'half_yearly': return `H${p.half} ${fyLabel(p.year as number)}`;
    case 'yearly': return fyLabel(p.year as number);
    default: return '';
  }
}

/** Display a stored task period. Rows created before period keys existed are shown as they were stored. */
export function formatPeriodColumns(row: {
  period_key?: string | null;
  period_year?: number | null;
  period_month?: number | null;
  period_quarter?: number | null;
}): string {
  if (row.period_key) {
    const p = parsePeriodKey(row.period_key);
    if (p) return formatPeriod(p);
  }
  if (!row.period_year) return '';
  if (row.period_month) return `${MONTHS[row.period_month - 1]} ${row.period_year}`;
  if (row.period_quarter) return `Q${row.period_quarter} ${row.period_year}`;
  return String(row.period_year);
}

export function periodToColumns(p: Period): PeriodColumns {
  return {
    period_type: p.type,
    period_key: p.key,
    period_year: p.year,
    period_month: p.type === 'monthly' ? p.month : null,
    period_quarter: p.type === 'quarterly' ? p.quarter : null,
  };
}

/** The period type a task uses, given its sub-service and the client's GST filing frequency. */
export function resolveTaskPeriodType(
  type: SubServicePeriodType,
  clientGstFrequency?: string | null,
): PeriodType {
  if (type !== 'gst_frequency') return type;
  return clientGstFrequency === 'qrmp' ? 'quarterly' : 'monthly';
}

/** A sub-service's declared period type. Falls back to its schedule frequency while period_type is unset. */
export function subServicePeriodType(sub: { period_type?: string | null; frequency?: string | null }): SubServicePeriodType {
  if (sub.period_type && (SUB_SERVICE_PERIOD_TYPES as readonly string[]).includes(sub.period_type)) {
    return sub.period_type as SubServicePeriodType;
  }
  switch (sub.frequency) {
    case 'monthly': return 'monthly';
    case 'quarterly': return 'quarterly';
    case 'annually': return 'yearly';
    default: return 'none';
  }
}

export type PeriodInput = {
  period_key?: string | null;
  period_year?: number | null;
  period_month?: number | null;
  period_quarter?: number | null;
};

export type PeriodResult = { ok: true; period: Period } | { ok: false; reason: string };

const has = (v: number | null | undefined): v is number => v !== null && v !== undefined;

/** Turn user or import input into a period of the required type, or explain why it does not fit. */
export function periodFromInput(type: PeriodType, input: PeriodInput): PeriodResult {
  const { period_key: key, period_year: year, period_month: month, period_quarter: quarter } = input;

  if (type === 'none') {
    if (key || has(year) || has(month) || has(quarter)) {
      return { ok: false, reason: 'This service does not use a period' };
    }
    return { ok: true, period: NO_PERIOD };
  }

  if (key) {
    const p = parsePeriodKey(key);
    if (!p) return { ok: false, reason: 'That period is not valid' };
    if (p.type !== type) return { ok: false, reason: `This service needs a ${type.replace('_', '-')} period` };
    return { ok: true, period: p };
  }

  const validYear = has(year) && year >= 2000 && year <= 2100;
  switch (type) {
    case 'monthly':
      if (has(quarter)) return { ok: false, reason: 'A monthly period cannot have a quarter' };
      if (!validYear || !has(month) || month < 1 || month > 12) return { ok: false, reason: 'Choose a month and year' };
      return { ok: true, period: makeMonthly(year as number, month) };
    case 'quarterly':
      if (has(month)) return { ok: false, reason: 'A quarterly period cannot have a month' };
      if (!validYear || !has(quarter) || quarter < 1 || quarter > 4) return { ok: false, reason: 'Choose a quarter and financial year' };
      return { ok: true, period: makeQuarterly(year as number, quarter) };
    case 'yearly':
      if (has(month) || has(quarter)) return { ok: false, reason: 'A yearly period cannot have a month or quarter' };
      if (!validYear) return { ok: false, reason: 'Choose a financial year' };
      return { ok: true, period: makeYearly(year as number) };
    default:
      return { ok: false, reason: 'Choose a half-year and financial year' };
  }
}

export type PeriodOption = { key: string; label: string };

/** The periods offered in the picker, newest first. */
export function periodOptions(type: PeriodType, today: { year: number; month: number }): PeriodOption[] {
  const fy = fyStartYear(today.year, today.month);
  const out: PeriodOption[] = [];
  switch (type) {
    case 'monthly': {
      let y = today.year;
      let m = today.month + 1;
      if (m > 12) { m = 1; y += 1; }
      for (let i = 0; i < 20; i++) {
        const p = makeMonthly(y, m);
        out.push({ key: p.key as string, label: formatPeriod(p) });
        m -= 1;
        if (m < 1) { m = 12; y -= 1; }
      }
      return out;
    }
    case 'quarterly':
      for (const start of [fy, fy - 1]) {
        for (let q = 4; q >= 1; q--) {
          const p = makeQuarterly(start, q);
          out.push({ key: p.key as string, label: `${formatPeriod(p)} (${QUARTER_RANGES[q - 1]})` });
        }
      }
      return out;
    case 'half_yearly':
      for (const start of [fy, fy - 1]) {
        for (let h = 2; h >= 1; h--) {
          const p = makeHalfYearly(start, h);
          out.push({ key: p.key as string, label: `${formatPeriod(p)} (${h === 1 ? 'Apr-Sep' : 'Oct-Mar'})` });
        }
      }
      return out;
    case 'yearly':
      for (let start = fy + 1; start >= fy - 5; start--) {
        const p = makeYearly(start);
        out.push({ key: p.key as string, label: formatPeriod(p) });
      }
      return out;
    default:
      return out;
  }
}

/** The period that has most recently ended: what a filing task created today is usually for. */
export function defaultPeriodKey(type: PeriodType, today: { year: number; month: number }): string | null {
  switch (type) {
    case 'monthly': {
      const m = today.month === 1 ? 12 : today.month - 1;
      const y = today.month === 1 ? today.year - 1 : today.year;
      return makeMonthly(y, m).key;
    }
    case 'quarterly': {
      const fy = fyStartYear(today.year, today.month);
      const q = fiscalQuarterOfMonth(today.month);
      return q === 1 ? makeQuarterly(fy - 1, 4).key : makeQuarterly(fy, q - 1).key;
    }
    case 'half_yearly': {
      const fy = fyStartYear(today.year, today.month);
      const inFirstHalf = fiscalQuarterOfMonth(today.month) <= 2;
      return inFirstHalf ? makeHalfYearly(fy - 1, 2).key : makeHalfYearly(fy, 1).key;
    }
    case 'yearly':
      return makeYearly(fyStartYear(today.year, today.month) - 1).key;
    default:
      return null;
  }
}

/** The last day of a period, as an ISO date. Null for a period-less task. */
export function periodEndIso(p: Period): string | null {
  const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const iso = (y: number, m: number) => `${y}-${pad2(m)}-${pad2(lastDay(y, m))}`;
  switch (p.type) {
    case 'monthly': return iso(p.year as number, p.month as number);
    case 'quarterly': {
      // Q1 ends June, Q2 September, Q3 December, Q4 March of the following year.
      const endMonth = 6 + 3 * ((p.quarter as number) - 1);
      return endMonth > 12 ? iso((p.year as number) + 1, endMonth - 12) : iso(p.year as number, endMonth);
    }
    case 'half_yearly': return p.half === 1 ? iso(p.year as number, 9) : iso((p.year as number) + 1, 3);
    case 'yearly': return iso((p.year as number) + 1, 3);
    default: return null;
  }
}
