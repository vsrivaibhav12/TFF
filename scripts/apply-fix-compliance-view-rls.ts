/**
 * Apply db/fix-compliance-view-rls.sql via Supabase Management API.
 * Adds compliance.view to SELECT policies on compliance tables.
 * Run: npx tsx scripts/apply-fix-compliance-view-rls.ts
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
  const file = path.join(process.cwd(), 'db', 'fix-compliance-view-rls.sql');
  const sql = fs.readFileSync(file, 'utf8');
  console.log(`[fix-compliance-view-rls] applying...`);
  await runSql(sql, 'fix-compliance-view-rls');
  console.log('[fix-compliance-view-rls] done');
}

main().catch((e) => { console.error('[fix-compliance-view-rls] FATAL', e?.message ?? e); process.exit(1); });
