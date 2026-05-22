import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const sql = fs.readFileSync(path.resolve(__dirname, '../db/schema-task-indices.sql'), 'utf-8');

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
  console.log('Task composite indices applied.');
}

main();
