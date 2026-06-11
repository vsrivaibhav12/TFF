#!/usr/bin/env node
/**
 * Apply db/rls-capabilities.sql to the linked Supabase project,
 * skipping policy blocks for tables that don't exist.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const SQL_FILE = 'db/rls-capabilities.sql';
const FILTERED_FILE = path.join(os.tmpdir(), 'rls-capabilities-filtered.sql');

// 1. Get existing tables
function getExistingTables() {
  const out = execSync(
    `npx supabase db query --linked "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" --output json`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
  const lines = out.trim().split('\n').filter(l => l.trim());
  let rows = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      rows = JSON.parse(lines[i]);
      if (Array.isArray(rows)) break;
    } catch { /* ignore */ }
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    try {
      rows = JSON.parse(out.trim());
      if (!Array.isArray(rows)) rows = [];
    } catch { /* ignore */ }
  }
  return new Set(rows.map((r) => r.tablename || r['tablename'] || r['TABLE_NAME']).filter(Boolean));
}

// 2. Parse SQL into blocks. A block is a unit that should run atomically.
// Policy blocks are: comment + DROP POLICY + CREATE POLICY (multi-line, ending with ;)
// Non-policy statements are individual semicolon-delimited chunks.
function parseBlocks(sql) {
  const lines = sql.split('\n');
  const blocks = [];
  let current = [];
  let inPolicyBlock = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect start of a policy block
    if (/^DROP\s+POLICY\s+IF\s+EXISTS/i.test(trimmed)) {
      inPolicyBlock = true;
      if (current.length > 0) {
        blocks.push({ type: 'other', text: current.join('\n') });
        current = [];
      }
    }

    current.push(line);

    if (inPolicyBlock) {
      braceDepth += (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
      if (trimmed.endsWith(';') && braceDepth === 0) {
        // End of this policy statement
        // Check if next non-empty line starts with CREATE POLICY
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === '') j++;
        if (j < lines.length && /^CREATE\s+POLICY/i.test(lines[j].trim())) {
          // Continue collecting the CREATE POLICY part
        } else {
          // Policy block is complete
          blocks.push({ type: 'policy', text: current.join('\n') });
          current = [];
          inPolicyBlock = false;
        }
      }
    } else if (!inPolicyBlock && trimmed.endsWith(';')) {
      blocks.push({ type: 'other', text: current.join('\n') });
      current = [];
    }
  }

  if (current.length > 0) {
    blocks.push({ type: current.some(l => /^(DROP|CREATE)\s+POLICY/i.test(l.trim())) ? 'policy' : 'other', text: current.join('\n') });
  }

  return blocks;
}

function extractTableNameFromBlock(block) {
  const m = block.match(/(?:DROP|CREATE)\s+POLICY[^;]*ON\s+([a-z_][a-z0-9_]*)/i);
  return m ? m[1] : null;
}

async function main() {
  console.log('Fetching existing tables from linked project...');
  const existingTables = getExistingTables();
  console.log(`Found ${existingTables.size} tables.`);

  const sql = fs.readFileSync(SQL_FILE, 'utf-8');
  const blocks = parseBlocks(sql);
  console.log(`Parsed ${blocks.length} blocks.`);

  let skipped = 0;
  const filtered = [];

  for (const block of blocks) {
    if (block.type === 'policy') {
      const table = extractTableNameFromBlock(block.text);
      if (table && !existingTables.has(table)) {
        console.log(`SKIP (table missing): ${table}`);
        skipped++;
        continue;
      }
    }
    filtered.push(block.text);
  }

  fs.writeFileSync(FILTERED_FILE, filtered.join('\n\n'));
  console.log(`\nWrote filtered SQL to ${FILTERED_FILE}`);
  console.log(`Skipped ${skipped} policy blocks for missing tables.`);
  console.log(`Executing remaining statements via Management API...\n`);

  try {
    const result = execSync(
      `npx supabase db query --linked --file "${FILTERED_FILE}" --output json`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120000 }
    );
    console.log(result);
    console.log('\nRLS migration applied successfully.');
  } catch (err) {
    console.error('\nERROR during execution:');
    console.error(err.stderr || err.message || err);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
