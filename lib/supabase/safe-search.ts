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
  return `%${sanitizeSearchTerm(term)}%`;
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
