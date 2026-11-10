import { describe, it } from 'node:test';
import assert from 'node:assert';
import { safeRedirectPath } from '../lib/auth/safe-redirect';
import { isAuthorizedCron } from '../lib/auth/cron-auth';

describe('safeRedirectPath', () => {
  it('accepts in-app paths', () => {
    assert.strictEqual(safeRedirectPath('/admin/tasks'), '/admin/tasks');
    assert.strictEqual(safeRedirectPath('/team/clients?page=2'), '/team/clients?page=2');
  });

  it('rejects external and tricky targets', () => {
    for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', 'evil.com', '/\t/evil.com', '', null, undefined]) {
      assert.strictEqual(safeRedirectPath(bad as string | null | undefined), null, String(bad));
    }
  });
});

describe('isAuthorizedCron', () => {
  const make = (headers: Record<string, string>) => new Request('https://example.com/api/cron/x', { headers });

  it('rejects the spoofable x-vercel-cron header on its own', () => {
    process.env.CRON_SECRET = 'top-secret';
    assert.strictEqual(isAuthorizedCron(make({ 'x-vercel-cron': '1' })), false);
  });

  it('accepts the correct bearer token and rejects a wrong one', () => {
    process.env.CRON_SECRET = 'top-secret';
    assert.strictEqual(isAuthorizedCron(make({ authorization: 'Bearer top-secret' })), true);
    assert.strictEqual(isAuthorizedCron(make({ authorization: 'Bearer wrong' })), false);
  });

  it('fails closed when CRON_SECRET is not configured', () => {
    delete process.env.CRON_SECRET;
    assert.strictEqual(isAuthorizedCron(make({ authorization: 'Bearer undefined' })), false);
    assert.strictEqual(isAuthorizedCron(make({})), false);
  });
});
