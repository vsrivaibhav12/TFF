import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

describe('UI guards', () => {
  it('no Select option has an empty value (Radix throws and the whole screen shows "Something went wrong")', () => {
    const offenders: string[] = [];
    for (const dir of ['app', 'components']) {
      for (const file of walk(join(process.cwd(), dir))) {
        const text = readFileSync(file, 'utf-8');
        const re = /<SelectItem\b[^>]*?\bvalue=(?:""|''|\{\s*(?:""|'')\s*\})/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text))) {
          offenders.push(`${file.replace(process.cwd(), '')}:${text.slice(0, m.index).split('\n').length}`);
        }
      }
    }
    assert.deepEqual(offenders, [], `Empty SelectItem values:\n${offenders.join('\n')}`);
  });

  it('no edit control is visible only on hover (keyboard and touch users could not reach it)', () => {
    const offenders: string[] = [];
    for (const dir of ['app', 'components']) {
      for (const file of walk(join(process.cwd(), dir))) {
        const lines = readFileSync(file, 'utf-8').split('\n');
        lines.forEach((line, i) => {
          if (line.includes('Pencil') && line.includes('opacity-0')) {
            offenders.push(`${file.replace(process.cwd(), '')}:${i + 1}`);
          }
        });
      }
    }
    assert.deepEqual(offenders, [], `Hover-only edit controls:\n${offenders.join('\n')}`);
  });
});

describe('tasks page', () => {
  it('declares `base` before the summary tiles use it (a use inside a callback is not caught by the type checker)', () => {
    const text = readFileSync(join(process.cwd(), 'components/tasks/tasks-list-page.tsx'), 'utf-8');
    const declared = text.indexOf('const base =');
    const used = text.indexOf('tileHref(tile, flat, base)');
    assert.ok(declared >= 0 && used >= 0);
    assert.ok(declared < used, 'const base must come before its first use');
    assert.equal(text.split('const base =').length - 1, 1, 'base must be declared once');
  });
});
