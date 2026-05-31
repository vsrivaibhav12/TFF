import 'server-only';
import * as XLSX from 'xlsx';

export interface ParsedTaskRow {
  row_index: number;
  client_name: string;
  client_pan?: string;
  sub_service?: string;
  assignee?: string;
  priority?: string;
  period_year?: string;
  period?: string;
  due_date?: string;
  errors: string[];
}

const HEADER_ALIASES: Record<string, keyof ParsedTaskRow> = {
  'client name': 'client_name',
  'client': 'client_name',
  'business name': 'client_name',
  'name': 'client_name',
  'client pan': 'client_pan',
  'pan': 'client_pan',
  'sub service': 'sub_service',
  'sub service code': 'sub_service',
  'sub service name': 'sub_service',
  'service': 'sub_service',
  'assignee': 'assignee',
  'assignee name': 'assignee',
  'assigned to': 'assignee',
  'priority': 'priority',
  'year': 'period_year',
  'period year': 'period_year',
  'period': 'period',
  'month': 'period',
  'quarter': 'period',
  'due date': 'due_date',
  'due': 'due_date',
  'deadline': 'due_date'
};

function normHeader(h: string): keyof ParsedTaskRow | null {
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

export function parseTasksBuffer(buffer: Buffer | Uint8Array, fileName?: string): ParsedTaskRow[] {
  const isCsv = (fileName ?? '').toLowerCase().endsWith('.csv');
  const wb = XLSX.read(buffer, { type: isCsv ? 'string' : 'buffer', raw: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  if (aoa.length === 0) return [];

  const headerRow = aoa[0];
  const headerMap: Array<keyof ParsedTaskRow | null> = headerRow.map((h: any) => normHeader(h));

  const rows: ParsedTaskRow[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const r = aoa[i];
    if (!r || r.every((c: any) => s(c) === '')) continue;
    const out: ParsedTaskRow = {
      row_index: i + 1,
      client_name: '',
      errors: [],
    };
    headerMap.forEach((key, idx) => {
      if (!key) return;
      const v = s(r[idx]);
      if (key === 'errors' || key === 'row_index') return;
      (out as any)[key] = v || undefined;
    });

    out.client_name = out.client_name ? out.client_name.trim() : '';
    if (out.client_pan) out.client_pan = normalizePan(out.client_pan);
    if (out.sub_service) out.sub_service = out.sub_service.trim();
    if (out.assignee) out.assignee = out.assignee.trim();
    if (out.priority) out.priority = out.priority.trim().toLowerCase();
    if (out.period_year) out.period_year = out.period_year.trim();
    if (out.period) out.period = out.period.trim();
    if (out.due_date) out.due_date = out.due_date.trim();

    if (!out.client_name) out.errors.push('Client Name is required');
    if (!out.sub_service) out.errors.push('Sub Service is required');
    if (out.priority && !['low', 'medium', 'high', 'urgent'].includes(out.priority)) {
      out.errors.push(`Invalid priority: ${out.priority}`);
    }

    // Validation for Year and Period
    if (out.period_year && !/^\d{4}$/.test(out.period_year)) {
        out.errors.push(`Invalid year format: ${out.period_year}`);
    }

    rows.push(out);
  }

  return rows;
}

export function summarizeTaskRows(rows: ParsedTaskRow[]) {
  const total = rows.length;
  const error = rows.filter((r) => r.errors.length > 0).length;
  const ready = total - error;
  return { total, ready, error };
}
