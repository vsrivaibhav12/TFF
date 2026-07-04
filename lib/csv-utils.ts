/**
 * CSV helpers.
 */

const FORMULA_PREFIXES = /^[=+\-@]/;

/**
 * Sanitize a cell value for CSV export. In addition to standard CSV escaping,
 * this prefixes values that start with formula-triggering characters (`=`, `+`,
 * `-`, `@`) with a tab character so spreadsheet applications treat them as
 * plain text rather than executable formulas.
 */
export function csvEscapeCell(val: unknown): string {
  let s = val === null || val === undefined ? '' : String(val);
  if (FORMULA_PREFIXES.test(s)) {
    s = `\t${s}`;
  }
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Convert an array of plain objects to a CSV string.
 */
export function convertToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => csvEscapeCell(row[h])).join(',')),
  ];
  return lines.join('\n');
}
