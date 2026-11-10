import 'server-only';

const POSTGREST_STRUCTURAL = /[,()\[\]:.]/g;

/**
 * Sanitize a user-supplied search term so it can safely be embedded in a
 * PostgREST filter value. This strips structural characters that would break
 * `.or()` string parsing (` ,()[]:. `). The term remains suitable for
 * `.ilike('%term%')` substring searches.
 */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(POSTGREST_STRUCTURAL, '');
}

/**
 * Build a safe `%term%` pattern for `.ilike()` calls.
 */
export function wrapLike(term: string): string {
  // Terms are always passed as the single value argument of `.ilike(column, value)`,
  // never inside `.or()`, so punctuation is safe and must be kept. Stripping "." and
  // "()" made names like "ABC Pvt. Ltd." or "M/s X (India)" impossible to find.
  // Only the LIKE wildcards are escaped so "50%" or "a_b" match literally.
  const escaped = term.replace(/[\\%_]/g, (ch) => '\\' + ch);
  return `%${escaped}%`;
}

/**
 * Merge multiple result arrays, deduplicating by `id` and preserving the
 * order of first appearance.
 */
export function mergeById<T extends { id?: string }>(arrays: T[][]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const arr of arrays) {
    for (const row of arr ?? []) {
      const id = row.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(row);
    }
  }
  return out;
}
