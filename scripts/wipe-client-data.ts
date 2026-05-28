/**
 * Execute db/migrations/2026-05-28-wipe-client-data.sql
 *
 * WARNING: This permanently deletes all clients and associated data.
 * Preserves: services, sub_services, task_templates, task_template_steps,
 *            sub_service_sop_steps, service_categories, users_profile.
 *
 * Usage:
 *   npm run db:wipe-client-data
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

  const sqlPath = path.join(process.cwd(), 'db', 'migrations', '2026-05-28-wipe-client-data.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('');
  console.log('==============================================================');
  console.log('WARNING: This will PERMANENTLY delete all client data.');
  console.log('Tables affected: clients, tasks, notices, credentials, DSC,');
  console.log('  filings, documents, queries, work_done, and all child tables.');
  console.log('Preserved: services, sub_services, task_templates, steps, users.');
  console.log('==============================================================');
  console.log('');
  console.log(`Target project: ${REF}`);
  console.log(`SQL file: ${sqlPath}`);
  console.log('');

  await runSql(sql, 'wipe-client-data');
  console.log('[wipe-client-data] done — all client data has been deleted.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
