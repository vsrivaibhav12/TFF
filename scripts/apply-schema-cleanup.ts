/**
 * Apply the schema cleanup bundle via the Supabase Management API.
 * Idempotent — safe to re-run.
 *
 * Files applied (in order):
 *  1. db/schema-additions.sql     — additive v3.1 schema + task_template_steps
 *  2. db/schema-fixes.sql         — boolean constraints, verification_status fix
 *  3. db/schema-v3-4.sql          — promoted migration-only tables + v_unified_inbox
 *  4. db/schema-all-work-items.sql — drop insecure all_work_items view
 *  5. db/migrations/2026-06-13-drop-dead-tables.sql
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
import fs from 'fs';
loadEnv({ path: path.join(process.cwd(), '.env.local') });

const PAT = process.env.SUPABASE_ACCESS_TOKEN!;
const REF = process.env.SUPABASE_PROJECT_REF!;
if (!PAT || !REF) {
  console.error('Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF');
  process.exit(1);
}
const ENDPOINT = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function runSql(query: string, label: string) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`[${label}] HTTP ${res.status}: ${text.slice(0, 1500)}`);
  }
  return text;
}

async function applyFile(filePath: string, label: string) {
  const sql = fs.readFileSync(path.join(process.cwd(), ...filePath.split('/')), 'utf8');
  console.log(`[schema-cleanup] applying ${label} (${(sql.length / 1024).toFixed(1)} KB)`);
  await runSql(sql, label);
  console.log(`[schema-cleanup] ${label} OK`);
}

async function main() {
  await applyFile('db/schema-additions.sql', 'schema-additions');
  await applyFile('db/schema-fixes.sql', 'schema-fixes');
  await applyFile('db/schema-v3-4.sql', 'schema-v3-4');
  await applyFile('db/schema-all-work-items.sql', 'schema-all-work-items');
  await applyFile('db/migrations/2026-06-13-drop-dead-tables.sql', 'drop-dead-tables');

  // Verify representative promoted objects
  const verify = await runSql(
    `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public'
         AND table_name IN (
           'bizlens_period_snapshots','gst_monthly_data','income_tax_slabs','task_template_steps'
         )
       ORDER BY table_name;`,
    'verify-promoted-tables',
  );
  console.log('[schema-cleanup] promoted tables:', verify);

  const viewVerify = await runSql(
    `SELECT table_name FROM information_schema.views
       WHERE table_schema='public' AND table_name = 'v_unified_inbox';`,
    'verify-unified-inbox-view',
  );
  console.log('[schema-cleanup] v_unified_inbox view:', viewVerify);

  const dropped = await runSql(
    `SELECT string_agg(table_name, ', ' ORDER BY table_name) AS remaining
       FROM information_schema.tables
       WHERE table_schema='public'
         AND table_name IN (
           'work_done','firm_profile','documents','vendors','vendor_gst_filings',
           'document_requests','sub_service_document_request_templates','task_document_requests',
           'payroll_adjustments','leave_balances','holidays','financial_data','engagement_letters',
           'client_lifecycle_stage','client_feature_flags','client_communication_log','benchmarks'
         );`,
    'verify-dead-tables-dropped',
  );
  console.log('[schema-cleanup] dead tables remaining:', dropped);

  console.log('[schema-cleanup] DONE');
}

main().catch((e) => {
  console.error('[schema-cleanup] FATAL', e?.message ?? e);
  process.exit(1);
});
