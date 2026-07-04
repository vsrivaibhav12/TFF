import 'server-only';

export const ALLOWED_IMPORT_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
];

export const ALLOWED_IMPORT_EXTENSIONS = ['.csv', '.xls', '.xlsx'];

const XLSX_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // ZIP header (XLSX is a ZIP archive)
const XLS_MAGIC = [0xd0, 0xcf, 0x11, 0xe0]; // OLE2 header (legacy XLS)

function hasExtension(name: string, extensions: string[]): boolean {
  const lower = name.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}

function matchesMagic(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((b, i) => bytes[i] === b);
}

/**
 * Validate an uploaded import file.
 * Returns { ok: true } or { ok: false, error: string }.
 */
export function validateImportFile(file: File, bytes: ArrayBuffer): { ok: true } | { ok: false; error: string } {
  if (file.size === 0) return { ok: false, error: 'Empty file' };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: 'File exceeds 5 MB limit' };

  if (!hasExtension(file.name, ALLOWED_IMPORT_EXTENSIONS)) {
    return { ok: false, error: 'Invalid file extension. Allowed: .csv, .xls, .xlsx' };
  }

  if (!ALLOWED_IMPORT_MIME_TYPES.includes(file.type)) {
    return { ok: false, error: 'Invalid file type' };
  }

  const view = new Uint8Array(bytes.slice(0, 8));

  const isCsv = file.name.toLowerCase().endsWith('.csv');
  const isXlsx = file.name.toLowerCase().endsWith('.xlsx');
  const isXls = file.name.toLowerCase().endsWith('.xls');

  if (isXlsx && !matchesMagic(view, XLSX_MAGIC)) {
    return { ok: false, error: 'File does not appear to be a valid XLSX file' };
  }

  if (isXls && !matchesMagic(view, XLS_MAGIC)) {
    return { ok: false, error: 'File does not appear to be a valid XLS file' };
  }

  if (isCsv) {
    // Reject obvious binary content by checking for null bytes in the first chunk.
    const text = new TextDecoder().decode(bytes.slice(0, 4096));
    if (text.includes('\0')) {
      return { ok: false, error: 'CSV file contains binary data' };
    }
  }

  return { ok: true };
}
