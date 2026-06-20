/**
 * DB smoke test — validates that every .from('table') in app code
 * references a table that actually exists in the live Supabase project.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

// ── Config ──
const ROOT = process.cwd();
const SCAN_DIRS = ['lib', 'app', 'components', 'scripts'];

// Tables/views that have migrations ready but may not be applied yet
const PENDING_MIGRATIONS = new Set<string>([]);
const ENV_PATH = path.join(ROOT, '.env.local');

// ── Env parser (no dotenv dependency) ──
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(ENV_PATH)) return env;
  const raw = fs.readFileSync(ENV_PATH, 'utf8').replace(/\r/g, '');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return env;
}

const env = loadEnv();
const PAT = env.SUPABASE_ACCESS_TOKEN;
const REF = env.SUPABASE_PROJECT_REF;
const ENDPOINT = REF && PAT ? `https://api.supabase.com/v1/projects/${REF}/database/query` : null;

// ── Code scanner ──
function walk(dir: string, acc: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', '.next', '.git', 'biz-lens-source', 'legacy'].includes(ent.name)) continue;
      walk(p, acc);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

function extractTables(): Map<string, Set<string>> {
  const tables = new Map<string, Set<string>>();
  const files = SCAN_DIRS.flatMap((d) => {
    const dir = path.join(ROOT, d);
    return fs.existsSync(dir) ? walk(dir) : [];
  });

  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const re = /\.from\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const table = m[1];
      if (!tables.has(table)) tables.set(table, new Set());
      tables.get(table)!.add(path.relative(ROOT, f));
    }
  }
  return tables;
}

// ── Live schema fetcher ──
async function fetchLiveTables(): Promise<Set<string>> {
  if (!ENDPOINT) throw new Error('Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF in .env.local');
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type IN ('BASE TABLE', 'VIEW');`,
    }),
  });
  if (!res.ok) throw new Error(`Schema query failed: ${res.status} ${await res.text()}`);
  const rows = (await res.json()) as Array<{ table_name: string }>;
  return new Set(rows.map((r) => r.table_name));
}

// ── Test ──
describe('db:smoke — every .from() table exists in live DB', async () => {
  const appTables = extractTables();
  const liveTables = await fetchLiveTables();

  it('should have discovered tables in app code', () => {
    assert.ok(appTables.size > 0, `No tables found in app code under ${SCAN_DIRS.join(', ')}`);
  });

  it('should have fetched live schema', () => {
    assert.ok(liveTables.size > 0, `No tables found in live DB (project ${REF})`);
  });

  const missing: Array<{ table: string; files: string[] }> = [];
  for (const [table, files] of appTables) {
    if (PENDING_MIGRATIONS.has(table)) continue;
    if (!liveTables.has(table)) missing.push({ table, files: Array.from(files) });
  }

  if (missing.length > 0) {
    it(`missing tables: ${missing.map((m) => m.table).join(', ')}`, () => {
      const detail = missing
        .map((m) => `  ${m.table}\n    ${m.files.slice(0, 3).join('\n    ')}`)
        .join('\n');
      assert.fail(`Tables referenced in app but missing in live DB:\n${detail}`);
    });
  } else {
    it('all referenced tables exist in live DB', () => {
      assert.ok(true, `All ${appTables.size} referenced tables exist`);
    });
  }
});
