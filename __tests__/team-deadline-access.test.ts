import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getRequiredCapabilities } from '../lib/auth/nav-capabilities';
import { canGrantCapability } from '../lib/auth/capability-grant';

const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf-8');

describe('team access to creating deadline tasks', () => {
  it('the team page exists, reuses the admin screen and is gated by the delegated capability', () => {
    assert.ok(existsSync(join(process.cwd(), 'app/team/compliance/create-tasks/page.tsx')));
    assert.match(read('app/team/compliance/create-tasks/page.tsx'), /Impl\(props, '\/team'\)/);
    assert.match(read('components/shell/pages/deadline-tasks-page.tsx'), /requireCapabilityOrRedirect\(me, 'compliance\.generate_tasks'\)/);
  });

  it('the team nav entry and its sub-pages require the capability', () => {
    assert.deepEqual(getRequiredCapabilities('/team/compliance'), ['compliance.generate_tasks']);
    assert.deepEqual(getRequiredCapabilities('/team/compliance/create-tasks'), ['compliance.generate_tasks']);
  });

  it('every action that plans, creates or moves a deadline requires the capability first', () => {
    const src = read('lib/actions/deadline-tasks.ts');
    for (const name of ['getDeadlinePlanAction', 'createDeadlineTasksAction', 'changeDeadlineDueDateAction']) {
      const start = src.indexOf(`export async function ${name}`);
      assert.ok(start >= 0, name);
      const body = src.slice(start, src.indexOf('\nexport ', start + 1) === -1 ? undefined : src.indexOf('\nexport ', start + 1));
      const role = body.indexOf("requireRole(['admin', 'team'])");
      const cap = body.indexOf("requireCapability(me, 'compliance.generate_tasks')");
      assert.ok(role >= 0 && cap > role, `${name} must check the role, then the capability`);
    }
  });

  it('creating tasks refreshes the team lists as well as the admin ones', () => {
    const src = read('lib/actions/deadline-tasks.ts');
    assert.ok((src.match(/revalidatePath\('\/team\/tasks'\)/g) ?? []).length >= 2);
  });

  it('only a super admin can hand the capability to anyone', () => {
    assert.equal(canGrantCapability({ is_prime_admin: false }, 'compliance.generate_tasks'), false);
    assert.equal(canGrantCapability({ is_prime_admin: null }, 'compliance.generate_tasks'), false);
    assert.equal(canGrantCapability({ is_prime_admin: true }, 'compliance.generate_tasks'), true);
  });
});

describe('the team home and tasks pages stay team-safe', () => {
  it('the team home reads the member view, not the admin one', () => {
    const src = read('app/team/page.tsx');
    assert.match(src, /getMemberHome|getManagerHome/);
    assert.doesNotMatch(src, /getAdminHome/);
  });

  it('the Unassigned tile is for admins only', async () => {
    const { taskTiles } = await import('../lib/tasks/tiles');
    const dates = { todayIso: '2026-11-11', weekEndIso: '2026-11-18', yesterdayIso: '2026-11-10' };
    assert.ok(!taskTiles({ ...dates, isAdmin: false }).some((t) => t.key === 'unassigned'));
  });
});
