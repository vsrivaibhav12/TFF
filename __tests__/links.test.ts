import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { findBrokenLinks } from '../scripts/verify-links';

describe('internal links', () => {
  it('every link in the app points at a page that exists', () => {
    const broken = findBrokenLinks(process.cwd());
    assert.deepEqual(broken, [], `Broken links:\n${broken.map((b) => `  ${b.file}:${b.line} ${b.link}`).join('\n')}`);
  });

  it('the checker really does catch a link to a missing page', () => {
    const root = mkdtempSync(join(tmpdir(), 'links-'));
    try {
      mkdirSync(join(root, 'app', 'admin', 'tasks', '[id]'), { recursive: true });
      mkdirSync(join(root, 'components'), { recursive: true });
      writeFileSync(join(root, 'app', 'admin', 'tasks', 'page.tsx'), 'export default function P(){return null}');
      writeFileSync(join(root, 'app', 'admin', 'tasks', '[id]', 'page.tsx'), 'export default function P(){return null}');
      writeFileSync(
        join(root, 'components', 'x.tsx'),
        [
          'const a = <Link href="/admin/tasks">ok</Link>;',
          'const b = <Link href={`/admin/tasks/${id}`}>ok</Link>;',
          'const c = <Link href="/admin/queries">gone</Link>;',
          'router.push(`/admin/templates/${id}`);',
          'const d = path.replace("/clients", "/tasks");',
        ].join('\n'),
      );
      const broken = findBrokenLinks(root).map((b) => b.link);
      assert.deepEqual(broken.sort(), ['/admin/queries', '/admin/templates/${…}'].sort());
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
