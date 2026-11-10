/**
 * Fetch every row of a query, working around the API's silent 1,000-row cap
 * (PostgREST `max_rows`). Without this, any list longer than 1,000 rows is
 * truncated with no error, which is how clients after the letter S went missing.
 *
 * Paging with `.range()` is only reliable when the order is stable, so a
 * tie-breaker `ORDER BY id` is appended automatically. Pass `tieBreaker: null`
 * for a table that has no `id` column and order it yourself.
 *
 * @param queryBuilderFactory returns a fresh query builder each call
 * @param maxLimit maximum rows to return (default 50,000)
 * @param chunkSize rows per request (default 1,000, the API cap)
 * @param tieBreaker column appended to ORDER BY (default 'id')
 */
export async function fetchAll<T>(
  queryBuilderFactory: () => any,
  maxLimit: number = 50000,
  chunkSize: number = 1000,
  tieBreaker: string | null = 'id',
): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;

  while (out.length < maxLimit) {
    let q = queryBuilderFactory();
    if (tieBreaker) q = q.order(tieBreaker, { ascending: true });
    const want = Math.min(chunkSize, maxLimit - out.length);
    const { data, error } = await q.range(offset, offset + want - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    out.push(...(data as T[]));
    offset += data.length;

    if (data.length < want) break;
  }

  return out;
}

/** Split an array into fixed-size pieces (used to keep `.in()` lists short). */
export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
