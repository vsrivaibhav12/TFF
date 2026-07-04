/**
 * CI guardrail: verify that admin pages do not accept team users and team pages
 * do not require admin-only access. This prevents accidental privilege escalation
 * when pages are copied between /admin and /team.
 */
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();

function walk(dir: string, files: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, files);
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) files.push(full);
  }
  return files;
}

function hasPattern(content: string, pattern: RegExp) {
  return pattern.test(content);
}

const errors: string[] = [];

const adminPages = walk(join(ROOT, 'app/admin'));
for (const file of adminPages) {
  const content = readFileSync(file, 'utf-8');
  if (hasPattern(content, /requireRole\(\['admin',\s*'team'\]\)|requireRole\(\['team',\s*'admin'\]\)/)) {
    errors.push(`${file}: admin page must use requireRole('admin'), not dual-role`);
  }
}

const teamPages = walk(join(ROOT, 'app/team'));
for (const file of teamPages) {
  const content = readFileSync(file, 'utf-8');
  if (hasPattern(content, /requireRole\('admin'\)/)) {
    errors.push(`${file}: team page must not require admin-only access`);
  }
}

if (errors.length > 0) {
  console.error('Route gating violations found:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`Route gating OK: ${adminPages.length} admin pages, ${teamPages.length} team pages checked.`);
