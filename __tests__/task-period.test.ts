import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTaskPeriod } from '../lib/services/task-period';
import { buildTaskTitle } from '../lib/utils';

const ctx = (period_type: string, gstFrequency: string | null = null) => ({
  subService: { name: 'GSTR-3B', frequency: 'monthly', period_type },
  clientName: 'Acme Traders',
  gstFrequency,
});

describe('resolveTaskPeriod', () => {
  test('a task with no sub-service keeps whatever period it was given', () => {
    const r = resolveTaskPeriod({ subService: null, clientName: 'Acme', gstFrequency: null }, { period_year: 2026, period_month: 4 });
    assert.deepEqual(r, { ok: true, period: null, columns: null, title: null });
  });

  test('monthly: builds columns, key and title', () => {
    const r = resolveTaskPeriod(ctx('monthly'), { period_year: 2026, period_month: 10 });
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.columns?.period_key, '2026-10');
      assert.equal(r.columns?.period_type, 'monthly');
      assert.equal(r.title, 'GSTR-3B — Acme Traders — Oct 2026');
    }
  });

  test('yearly: needs a financial year, shows FY in the title', () => {
    assert.equal(resolveTaskPeriod(ctx('yearly'), {}).ok, false);
    const r = resolveTaskPeriod(ctx('yearly'), { period_key: 'FY2025-26' });
    assert.ok(r.ok && r.title === 'GSTR-3B — Acme Traders — FY 2025-26');
  });

  test('none: no period allowed, title has no period part', () => {
    const bad = resolveTaskPeriod(ctx('none'), { period_year: 2026, period_month: 1 });
    assert.equal(bad.ok, false);
    const good = resolveTaskPeriod(ctx('none'), {});
    assert.ok(good.ok && good.title === 'GSTR-3B — Acme Traders' && good.columns?.period_type === 'none');
  });

  test('gst_frequency: a monthly client needs a month, a QRMP client needs a quarter', () => {
    assert.equal(resolveTaskPeriod(ctx('gst_frequency', 'monthly'), { period_key: '2026-10' }).ok, true);
    assert.equal(resolveTaskPeriod(ctx('gst_frequency', 'monthly'), { period_key: 'FY2026-27-Q2' }).ok, false);
    assert.equal(resolveTaskPeriod(ctx('gst_frequency', 'qrmp'), { period_key: 'FY2026-27-Q2' }).ok, true);
    assert.equal(resolveTaskPeriod(ctx('gst_frequency', 'qrmp'), { period_key: '2026-10' }).ok, false);
  });

  test('falls back to the schedule frequency while period_type is unset', () => {
    const r = resolveTaskPeriod({ subService: { name: 'ITR', frequency: 'annually' }, clientName: 'Acme', gstFrequency: null }, { period_year: 2025 });
    assert.ok(r.ok && r.columns?.period_key === 'FY2025-26');
  });

  test('the reason names what to fix', () => {
    const r = resolveTaskPeriod(ctx('quarterly'), { period_year: 2026 });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.reason, /quarter/i);
  });
});

describe('buildTaskTitle with a period key', () => {
  test('uses the uniform period label', () => {
    assert.equal(buildTaskTitle({ subServiceName: 'TDS return', clientName: 'Acme', periodKey: 'FY2026-27-Q2' }), 'TDS return — Acme — Q2 FY 2026-27');
  });
  test('legacy callers still get the old format', () => {
    assert.equal(buildTaskTitle({ subServiceName: 'GSTR-1', clientName: 'Acme', periodYear: 2026, periodMonth: 4 }), 'GSTR-1 — Acme — 4/2026');
  });
});

import { storedPeriodInput } from '../lib/services/task-period';

describe('storedPeriodInput (what an unchanged task period counts as when its service changes)', () => {
  test('a keyed period is used as it is', () => {
    assert.deepEqual(storedPeriodInput({ period_key: 'FY2026-27-Q2', period_year: 2026, period_quarter: 2 }), { period_key: 'FY2026-27-Q2' });
  });
  test('an older monthly task still counts as that month', () => {
    assert.deepEqual(storedPeriodInput({ period_year: 2026, period_month: 10 }), { period_year: 2026, period_month: 10 });
  });
  test('older quarterly and yearly tasks are not guessed: they were calendar quarters and years', () => {
    assert.deepEqual(storedPeriodInput({ period_year: 2026, period_quarter: 1 }), {});
    assert.deepEqual(storedPeriodInput({ period_year: 2026 }), {});
  });
  test('no period', () => {
    assert.deepEqual(storedPeriodInput({}), {});
  });
});
