/**
 * Apply db/rls-2026-05-14-close-gaps.sql via Supabase Management API.
 * Idempotent (DROP POLICY IF EXISTS + CREATE POLICY).
 */
import { config as loadEnv } from 'dotenv';
import fs from 'fs';
import path from 'path';
loadEnv({ path: path.join(process.cwd(), '.env.local') });

const PAT = process.env.SUPABASE_ACCESS_TOKEN!;
const REF = process.env.SUPABASE_PROJECT_REF!;
const ENDPOINT = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function runSql(query: string, label: string) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${label}] HTTP ${res.status}: ${text.slice(0, 800)}`);
  return text;
}

async function main() {
  const file = path.join(process.cwd(), 'db', 'rls-2026-05-14-close-gaps.sql');
  const sql = fs.readFileSync(file, 'utf8');
  console.log(`[rls-close-gaps] applying (${(sql.length / 1024).toFixed(1)} KB)`);
  await runSql(sql, 'rls-close-gaps');

  // Sanity: count RLS-enabled tables and policies
  const r = await runSql(
    `SELECT count(*)::int AS tables FROM pg_tables WHERE schemaname='public' AND rowsecurity = true;`,
    'count-tables'
  );
  const p = await runSql(
    `SELECT count(*)::int AS policies FROM pg_policies WHERE schemaname='public';`,
    'count-policies'
  );
  console.log('[rls-close-gaps] RLS-enabled tables ->', r);
  console.log('[rls-close-gaps] policies ->', p);
}

main().catch((e) => { console.error('[rls-close-gaps] FATAL', e?.message ?? e); process.exit(1); });
