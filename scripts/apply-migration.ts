/**
 * Apply a single SQL migration file via Supabase Management API (REST).
 * This avoids needing direct Postgres credentials.
 * Usage: npx tsx scripts/apply-migration.ts <path-to-migration.sql>
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
loadEnv({ path: path.join(process.cwd(), '.env.local') });
import fs from 'fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: npx tsx scripts/apply-migration.ts <path-to-migration.sql>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(file), 'utf-8');

const projectRef = process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!projectRef || !accessToken) {
  console.error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN in .env.local');
  process.exit(1);
}

async function main() {
  console.log(`[apply-migration] Applying ${file} via Management API …`);

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('[apply-migration] API error:', res.status, text);
    process.exit(1);
  }

  const data = await res.json();
  console.log('[apply-migration] Done.', data);
}

main().catch((e) => {
  console.error('[apply-migration] FATAL', e?.message ?? e);
  process.exit(1);
});
