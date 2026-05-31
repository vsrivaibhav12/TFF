/**
 * Cache wrappers have been removed.
 *
 * React cache() cannot wrap functions that call createClient() because
 * createClient() reads cookies() — a dynamic data source. Next.js throws:
 *   "Route used 'cookies' inside a function cached with 'cache(...)'"
 *
 * If per-request deduplication is needed, pass the Supabase client as an
 * argument instead of creating it inside the cached function.
 */
