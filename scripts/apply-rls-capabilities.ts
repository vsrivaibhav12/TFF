/**
 * Apply db/rls-capabilities.sql via Supabase Management API.
 * Idempotent (DROP POLICY IF EXISTS + CREATE POLICY).
 * Run: npx tsx scripts/apply-rls-capabilities.ts
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
  const file = path.join(process.cwd(), 'db', 'rls-capabilities.sql');
  const sql = fs.readFileSync(file, 'utf8');
  console.log(`[rls-capabilities] applying (${(sql.length / 1024).toFixed(1)} KB)`);
  await runSql(sql, 'rls-capabilities');
  console.log('[rls-capabilities] done');

  // Quick sanity: count capability-aware policies
  const r = await runSql(
    `SELECT count(*)::int AS n FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE '%team%';`,
    'count-team-policies'
  );
  console.log('[rls-capabilities] team policies ->', r);
}

main().catch((e) => { console.error('[rls-capabilities] FATAL', e?.message ?? e); process.exit(1); });
