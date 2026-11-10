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
});
