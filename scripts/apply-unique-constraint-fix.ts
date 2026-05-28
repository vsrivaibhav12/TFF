/**
 * Apply db/migrations/2026-05-28-fix-unique-constraints-on-soft-deleted.sql
 *
 * Usage:
 *   npm run db:apply-unique-constraint-fix
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
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`[${label}] HTTP ${res.status}: ${text.slice(0, 800)}`);
  }
  return text;
}

async function main() {
  if (!PAT || !REF) throw new Error('SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF missing');

  const sqlPath = path.join(process.cwd(), 'db', 'migrations', '2026-05-28-fix-unique-constraints-on-soft-deleted.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log(`[unique-constraint-fix] target = project ${REF}`);
  console.log(`[unique-constraint-fix] running ${sqlPath}`);

  await runSql(sql, 'unique-constraint-fix');
  console.log('[unique-constraint-fix] done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
