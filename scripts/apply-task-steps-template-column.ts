/**
 * Add missing source_template_step_id column to task_steps.
 * Run: npx tsx scripts/apply-task-steps-template-column.ts
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
  const sql = `
    ALTER TABLE task_steps
    ADD COLUMN IF NOT EXISTS source_template_step_id UUID REFERENCES task_template_steps(id);
  `;
  console.log('[task-steps-template-column] applying...');
  await runSql(sql, 'task-steps-template-column');
  console.log('[task-steps-template-column] done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
