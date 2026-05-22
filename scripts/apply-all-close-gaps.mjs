import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
const envRaw = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envRaw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const PAT = env.SUPABASE_ACCESS_TOKEN;
const REF = env.SUPABASE_PROJECT_REF;
const ENDPOINT = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function runSql(query, label) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${label}] HTTP ${res.status}: ${text.slice(0, 800)}`);
  return text;
}

async function applyFile(filePath, label) {
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`[${label}] applying (${(sql.length / 1024).toFixed(1)} KB)`);
  await runSql(sql, label);
  console.log(`[${label}] OK`);
}

async function main() {
  await applyFile(path.join(process.cwd(), 'db/migrations/2026-05-14-bizlens-period-snapshots.sql'), 'bizlens-period-snapshots');
  await applyFile(path.join(process.cwd(), 'db/migrations/2026-05-14-income-tax-slabs.sql'), 'income-tax-slabs');
  await applyFile(path.join(process.cwd(), 'db/migrations/2026-05-14-work-done.sql'), 'work-done');
  await applyFile(path.join(process.cwd(), 'db/rls-2026-05-14-close-gaps.sql'), 'rls-close-gaps');

  const r = await runSql(`SELECT count(*)::int AS tables FROM pg_tables WHERE schemaname='public' AND rowsecurity = true;`, 'count-rls-tables');
  const p = await runSql(`SELECT count(*)::int AS policies FROM pg_policies WHERE schemaname='public';`, 'count-policies');
  console.log('[sanity] RLS-enabled tables ->', r);
  console.log('[sanity] policies ->', p);
  console.log('[close-gaps] ALL DONE');
}

main().catch((e) => { console.error('[close-gaps] FATAL', e?.message ?? e); process.exit(1); });
