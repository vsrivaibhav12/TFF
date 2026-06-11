/**
 * Apply db/fix-task-edit-rls.sql via Supabase Management API.
 * Fixes tasks_team_update_own to check tasks.edit instead of tasks.assign/tasks.complete.
 * Run: npx tsx scripts/apply-fix-task-edit-rls.ts
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
  const file = path.join(process.cwd(), 'db', 'fix-task-edit-rls.sql');
  const sql = fs.readFileSync(file, 'utf8');
  console.log(`[fix-task-edit-rls] applying...`);
  await runSql(sql, 'fix-task-edit-rls');
  console.log('[fix-task-edit-rls] done');

  // Sanity check: verify the policy exists
  const r = await runSql(
    `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'tasks_team_update_own';`,
    'verify-policy'
  );
  console.log('[fix-task-edit-rls] policy check ->', r);
}

main().catch((e) => { console.error('[fix-task-edit-rls] FATAL', e?.message ?? e); process.exit(1); });
