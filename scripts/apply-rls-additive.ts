/**
 * Apply db/rls-additive.sql via Supabase Management API.
 * Idempotent (DROP POLICY IF EXISTS + CREATE POLICY).
 * This file supplies the admin ALL policy on clients and other core tables
 * that schema.sql v3 does not include.
 * Run: npx tsx scripts/apply-rls-additive.ts
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
  const file = path.join(process.cwd(), 'db', 'rls-additive.sql');
  const sql = fs.readFileSync(file, 'utf8');
  console.log(`[rls-additive] applying (${(sql.length / 1024).toFixed(1)} KB)`);
  await runSql(sql, 'rls-additive');
  console.log('[rls-additive] done');

  // Quick sanity: confirm admin policy on clients exists
  const r = await runSql(
    `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'clients_admin_all';`,
    'verify-clients-admin-all'
  );
  console.log('[rls-additive] clients_admin_all ->', r);
}

main().catch((e) => { console.error('[rls-additive] FATAL', e?.message ?? e); process.exit(1); });
