import 'server-only';
import * as XLSX from 'xlsx';

export interface ParsedClientRow {
  row_index: number; // 1-based, matches spreadsheet row in user terms
  business_name: string;
  pan?: string;
  gstin?: string;
  category?: string;
  industry?: string;
  primary_contact_person?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  city?: string;
  state?: string;
  pincode?: string;
  group?: string;
  errors: string[];
}

const VALID_CATEGORIES = new Set([
  'sole_proprietor',
  'partnership',
  'llp',
  'pvt_ltd',
  'public_ltd',
  'huf',
  'aop',
  'ngo',
  'other',
]);

// Common category aliases that users might type in spreadsheets
const CATEGORY_ALIASES: Record<string, string> = {
  'sole proprietorship': 'sole_proprietor',
  'sole proprietor': 'sole_proprietor',
  'proprietorship': 'sole_proprietor',
  'proprietor': 'sole_proprietor',
  'partnership firm': 'partnership',
  'private limited': 'pvt_ltd',
  'private limited company': 'pvt_ltd',
  'pvt ltd': 'pvt_ltd',
  'pvt. ltd.': 'pvt_ltd',
  'public limited': 'public_ltd',
  'public limited company': 'public_ltd',
  'ltd': 'public_ltd',
  'limited liability partnership': 'llp',
  'hindu undivided family': 'huf',
  'association of persons': 'aop',
  'non profit': 'ngo',
  'non-profit': 'ngo',
  'trust': 'ngo',
  'society': 'ngo',
};

// Headers we accept (case-insensitive, trimmed). Map any of them to canonical key.
const HEADER_ALIASES: Record<string, keyof ParsedClientRow> = {
  'business name': 'business_name',
  'business_name': 'business_name',
  'name': 'business_name',
  'pan': 'pan',
  'gstin': 'gstin',
  'gst': 'gstin',
  'category': 'category',
  'type': 'category',
  'entity type': 'category',
  'industry': 'industry',
  'primary contact': 'primary_contact_person',
  'primary contact person': 'primary_contact_person',
  'contact name': 'primary_contact_person',
  'contact person': 'primary_contact_person',
  'email': 'primary_contact_email',
  'primary contact email': 'primary_contact_email',
  'phone': 'primary_contact_phone',
  'mobile': 'primary_contact_phone',
  'primary contact phone': 'primary_contact_phone',
  'city': 'city',
  'state': 'state',
  'pincode': 'pincode',
  'pin': 'pincode',
  'zip': 'pincode',
  'group': 'group',
  'client group': 'group',
  'group name': 'group',
};

function normHeader(h: string): keyof ParsedClientRow | null {
  const k = (h ?? '').toString().trim().toLowerCase();
  return (HEADER_ALIASES[k] as any) ?? null;
}

function s(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function normalizePan(v: string): string {
  return v.replace(/\s+/g, '').toUpperCase();
}

function normalizeGstin(v: string): string {
  return v.replace(/\s+/g, '').toUpperCase();
}

function normalizeCategory(v: string): string | undefined {
  const lower = v.toLowerCase().trim();
  if (VALID_CATEGORIES.has(lower)) return lower;
  const alias = CATEGORY_ALIASES[lower];
  if (alias) return alias;
  // Try fuzzy: remove spaces and punctuation
  const fuzzy = lower.replace(/[\s._-]+/g, '');
  for (const [key, val] of Object.entries(CATEGORY_ALIASES)) {
    if (key.replace(/[\s._-]+/g, '') === fuzzy) return val;
  }
  for (const valid of VALID_CATEGORIES) {
    if (valid.replace(/_/g, '') === fuzzy) return valid;
  }
  return undefined;
}

/**
 * Parse a CSV or XLSX buffer into normalized client rows.
 * - First non-empty row is treated as the header row.
 * - Returns an array even if rows have validation errors (per-row errors recorded).
 */
export function parseClientsBuffer(buffer: Buffer | Uint8Array, fileName?: string): ParsedClientRow[] {
  const isCsv = (fileName ?? '').toLowerCase().endsWith('.csv');
  const wb = XLSX.read(buffer, { type: isCsv ? 'string' : 'buffer', raw: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  if (aoa.length === 0) return [];

  const headerRow = aoa[0];
  const headerMap: Array<keyof ParsedClientRow | null> = headerRow.map((h: any) => normHeader(h));

  const rows: ParsedClientRow[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const r = aoa[i];
    if (!r || r.every((c: any) => s(c) === '')) continue;
    const out: ParsedClientRow = {
      row_index: i + 1,
      business_name: '',
      errors: [],
    };
    headerMap.forEach((key, idx) => {
      if (!key) return;
      const v = s(r[idx]);
      if (key === 'errors' || key === 'row_index') return;
      (out as any)[key] = v || undefined;
    });

    // --- Normalization ---
    out.business_name = out.business_name ? out.business_name.trim() : '';
    if (out.pan) out.pan = normalizePan(out.pan);
    if (out.gstin) out.gstin = normalizeGstin(out.gstin);
    if (out.category) {
      const normalized = normalizeCategory(out.category);
      if (normalized) out.category = normalized;
    }
    if (out.primary_contact_email) out.primary_contact_email = out.primary_contact_email.trim().toLowerCase();
    if (out.primary_contact_phone) out.primary_contact_phone = out.primary_contact_phone.replace(/\s+/g, '');
    if (out.city) out.city = out.city.trim();
    if (out.state) out.state = out.state.trim();
    if (out.pincode) out.pincode = out.pincode.trim();
    if (out.group) out.group = out.group.trim();

    // --- Validation ---
    if (!out.business_name) out.errors.push('business_name is required');
    if (out.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(out.pan)) {
      out.errors.push(`invalid PAN: ${out.pan}`);
    }
    if (out.gstin && !/^[0-9]{2}[A-Z0-9]{10}[0-9][A-Z][0-9A-Z]$/.test(out.gstin)) {
      out.errors.push(`invalid GSTIN: ${out.gstin}`);
    }
    if (out.category && !VALID_CATEGORIES.has(out.category)) {
      out.errors.push(`invalid category "${out.category}" (allowed: ${[...VALID_CATEGORIES].join(', ')})`);
    }
    if (out.primary_contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.primary_contact_email)) {
      out.errors.push(`invalid email: ${out.primary_contact_email}`);
    }
    rows.push(out);
  }

  return rows;
}

/**
 * Lightweight summary helpers used by the UI preview.
 */
export function summarizeRows(rows: ParsedClientRow[]) {
  const total = rows.length;
  const error = rows.filter((r) => r.errors.length > 0).length;
  const ready = total - error;
  return { total, ready, error };
}
