/**
 * Apply db/fix-template-cap-rls.sql via Supabase Management API.
 * Fixes missing SELECT policy on staff_role_template_capabilities.
 * Run: npx tsx scripts/apply-fix-template-cap-rls.ts
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
  const file = path.join(process.cwd(), 'db', 'fix-template-cap-rls.sql');
  const sql = fs.readFileSync(file, 'utf8');
  console.log(`[fix-template-cap-rls] applying...`);
  await runSql(sql, 'fix-template-cap-rls');
  console.log('[fix-template-cap-rls] done');

  // Sanity check: verify the policy exists
  const r = await runSql(
    `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff_role_template_capabilities' AND policyname = 'role_template_caps_read_all';`,
    'verify-policy'
  );
  console.log('[fix-template-cap-rls] policy check ->', r);
}

main().catch((e) => { console.error('[fix-template-cap-rls] FATAL', e?.message ?? e); process.exit(1); });
