/**
 * Master close-gaps apply script.
 * Applies RLS policies for tables that were exposed without Row Level Security.
 * Idempotent — safe to re-run.
 */
import fs from 'fs';
import path from 'path';

// Simple .env.local parser (no dotenv dependency)
const envPath = path.join(process.cwd(), '.env.local');
const envRaw = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
for (const line of envRaw.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const PAT = env.SUPABASE_ACCESS_TOKEN!;
const REF = env.SUPABASE_PROJECT_REF!;
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

async function applyFile(filePath: string, label: string) {
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`[${label}] applying (${(sql.length / 1024).toFixed(1)} KB)`);
  await runSql(sql, label);
  console.log(`[${label}] OK`);
}

async function main() {
  // RLS close-gaps
  await applyFile(path.join(process.cwd(), 'db/rls-2026-05-14-close-gaps.sql'), 'rls-close-gaps');

  // Sanity verification
  const r = await runSql(
    `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename IN ('notifications','global_audit_log','leave_requests','payroll_adjustments','hearings','compliance_insights','engagement_letters','client_lifecycle_stage','client_feature_flags','firm_profile','vendor_gst_filings','benchmarks');`,
    'verify-rls'
  );
  const p = await runSql(
    `SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('notifications','global_audit_log','leave_requests','payroll_adjustments','hearings','compliance_insights','engagement_letters','client_lifecycle_stage','client_feature_flags','firm_profile','vendor_gst_filings','benchmarks');`,
    'verify-policies'
  );
  console.log('[verify] RLS status:', r);
  console.log('[verify] Policies:', p);
  console.log('[close-gaps] ALL DONE');
}

main().catch((e) => { console.error('[close-gaps] FATAL', e?.message ?? e); process.exit(1); });
