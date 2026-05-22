import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sql = fs.readFileSync(path.resolve(__dirname, '../db/fix-attendance-rls.sql'), 'utf-8');

async function main() {
  const ref = process.env.SUPABASE_PROJECT_REF;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!ref || !token) {
    console.error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN');
    process.exit(1);
  }
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.json();
  if (!res.ok) {
    console.error('Apply failed:', body);
    process.exit(1);
  }
  console.log('Attendance RLS policies applied.');
}

main();
