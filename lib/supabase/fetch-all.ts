import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

/**
 * Helper to fetch all rows for a query, overcoming the Supabase max_rows limit (default 1000).
 * @param queryBuilderFactory A function that returns a fresh Supabase query builder
 * @param maxLimit The maximum number of rows to fetch (default 50000)
 * @param chunkSize The number of rows to fetch per chunk (default 1000)
 */
export async function fetchAll<T>(
  queryBuilderFactory: () => any,
  maxLimit: number = 50000,
  chunkSize: number = 1000
): Promise<T[]> {
  let allData: T[] = [];
  let currentOffset = 0;

  while (allData.length < maxLimit) {
    const q = queryBuilderFactory();
    const fetchLimit = Math.min(chunkSize, maxLimit - allData.length);
    const { data, error } = await q.range(currentOffset, currentOffset + fetchLimit - 1);
    
    if (error) throw error;
    if (!data || data.length === 0) break;
    
    allData = allData.concat(data);
    currentOffset += data.length;
    
    if (data.length < fetchLimit) break;
  }
  
  return allData;
}
