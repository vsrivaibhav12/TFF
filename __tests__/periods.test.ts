import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  fyStartYear,
  fyLabel,
  fiscalQuarterOfMonth,
  makeMonthly,
  makeQuarterly,
  makeHalfYearly,
  makeYearly,
  NO_PERIOD,
  parsePeriodKey,
  formatPeriod,
  formatPeriodColumns,
  periodToColumns,
  resolveTaskPeriodType,
  subServicePeriodType,
  periodFromInput,
  periodOptions,
  defaultPeriodKey,
} from '../lib/periods';

describe('financial year helpers', () => {
  test('fyStartYear: April starts a new financial year', () => {
    assert.equal(fyStartYear(2026, 4), 2026);
    assert.equal(fyStartYear(2026, 3), 2025);
    assert.equal(fyStartYear(2026, 12), 2026);
    assert.equal(fyStartYear(2027, 1), 2026);
  });
  test('fyLabel', () => {
    assert.equal(fyLabel(2025), 'FY 2025-26');
    assert.equal(fyLabel(2099), 'FY 2099-00');
  });
  test('fiscalQuarterOfMonth: Q1 is April to June', () => {
    assert.deepEqual([4, 6, 7, 9, 10, 12, 1, 3].map(fiscalQuarterOfMonth), [1, 1, 2, 2, 3, 3, 4, 4]);
  });
});

describe('period keys', () => {
  test('keys for each type', () => {
    assert.equal(makeMonthly(2026, 10).key, '2026-10');
    assert.equal(makeQuarterly(2026, 2).key, 'FY2026-27-Q2');
    assert.equal(makeHalfYearly(2026, 1).key, 'FY2026-27-H1');
    assert.equal(makeYearly(2025).key, 'FY2025-26');
    assert.equal(NO_PERIOD.key, null);
  });
  test('parsePeriodKey round-trips every type', () => {
    for (const p of [makeMonthly(2026, 1), makeQuarterly(2025, 4), makeHalfYearly(2025, 2), makeYearly(2026)]) {
      assert.deepEqual(parsePeriodKey(p.key as string), p);
    }
  });
  test('parsePeriodKey rejects bad keys', () => {
    for (const bad of ['', 'abc', '2026-13', '2026-00', 'FY2026-28', 'FY2026-27-Q5', 'FY2026-27-H3', 'FY26-27']) {
      assert.equal(parsePeriodKey(bad), null, bad);
    }
  });
});

describe('formatting', () => {
  test('formatPeriod', () => {
    assert.equal(formatPeriod(makeMonthly(2026, 10)), 'Oct 2026');
    assert.equal(formatPeriod(makeQuarterly(2026, 2)), 'Q2 FY 2026-27');
    assert.equal(formatPeriod(makeHalfYearly(2026, 1)), 'H1 FY 2026-27');
    assert.equal(formatPeriod(makeYearly(2025)), 'FY 2025-26');
    assert.equal(formatPeriod(NO_PERIOD), '');
  });
  test('formatPeriodColumns uses the key when present', () => {
    assert.equal(formatPeriodColumns({ period_key: 'FY2025-26' }), 'FY 2025-26');
  });
  test('formatPeriodColumns keeps showing legacy rows as they were stored', () => {
    assert.equal(formatPeriodColumns({ period_year: 2026, period_month: 10 }), 'Oct 2026');
    assert.equal(formatPeriodColumns({ period_year: 2026, period_quarter: 1 }), 'Q1 2026');
    assert.equal(formatPeriodColumns({ period_year: 2026 }), '2026');
    assert.equal(formatPeriodColumns({}), '');
  });
});

describe('columns', () => {
  test('periodToColumns maps each type', () => {
    assert.deepEqual(periodToColumns(makeMonthly(2026, 10)), { period_type: 'monthly', period_key: '2026-10', period_year: 2026, period_month: 10, period_quarter: null });
    assert.deepEqual(periodToColumns(makeQuarterly(2026, 2)), { period_type: 'quarterly', period_key: 'FY2026-27-Q2', period_year: 2026, period_month: null, period_quarter: 2 });
    assert.deepEqual(periodToColumns(makeHalfYearly(2026, 2)), { period_type: 'half_yearly', period_key: 'FY2026-27-H2', period_year: 2026, period_month: null, period_quarter: null });
    assert.deepEqual(periodToColumns(makeYearly(2025)), { period_type: 'yearly', period_key: 'FY2025-26', period_year: 2025, period_month: null, period_quarter: null });
    assert.deepEqual(periodToColumns(NO_PERIOD), { period_type: 'none', period_key: null, period_year: null, period_month: null, period_quarter: null });
  });
});

describe('period type resolution', () => {
  test('gst_frequency follows the client', () => {
    assert.equal(resolveTaskPeriodType('gst_frequency', 'qrmp'), 'quarterly');
    assert.equal(resolveTaskPeriodType('gst_frequency', 'monthly'), 'monthly');
    assert.equal(resolveTaskPeriodType('gst_frequency', null), 'monthly');
    assert.equal(resolveTaskPeriodType('gst_frequency', 'not_applicable'), 'monthly');
  });
  test('fixed types pass through', () => {
    assert.equal(resolveTaskPeriodType('yearly', 'qrmp'), 'yearly');
    assert.equal(resolveTaskPeriodType('none', null), 'none');
  });
  test('subServicePeriodType prefers period_type and falls back to frequency', () => {
    assert.equal(subServicePeriodType({ period_type: 'half_yearly', frequency: 'monthly' }), 'half_yearly');
    assert.equal(subServicePeriodType({ frequency: 'monthly' }), 'monthly');
    assert.equal(subServicePeriodType({ frequency: 'quarterly' }), 'quarterly');
    assert.equal(subServicePeriodType({ frequency: 'annually' }), 'yearly');
    assert.equal(subServicePeriodType({ frequency: 'on_demand' }), 'none');
    assert.equal(subServicePeriodType({}), 'none');
  });
});

describe('periodFromInput', () => {
  test('none: nothing is fine, any period is rejected', () => {
    assert.equal(periodFromInput('none', {}).ok, true);
    assert.equal(periodFromInput('none', { period_year: null, period_month: null }).ok, true);
    const r = periodFromInput('none', { period_year: 2026, period_month: 4 });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.reason, /does not use a period/);
  });
  test('monthly from columns or key', () => {
    const a = periodFromInput('monthly', { period_year: 2026, period_month: 10 });
    assert.ok(a.ok && a.period.key === '2026-10');
    const b = periodFromInput('monthly', { period_key: '2026-10' });
    assert.ok(b.ok && b.period.month === 10);
  });
  test('monthly rejects a missing month, a quarter, and a key of another type', () => {
    assert.equal(periodFromInput('monthly', { period_year: 2026 }).ok, false);
    assert.equal(periodFromInput('monthly', { period_year: 2026, period_month: 4, period_quarter: 1 }).ok, false);
    assert.equal(periodFromInput('monthly', { period_key: 'FY2026-27-Q2' }).ok, false);
  });
  test('quarterly uses the financial-year start as the year', () => {
    const r = periodFromInput('quarterly', { period_year: 2026, period_quarter: 2 });
    assert.ok(r.ok && r.period.key === 'FY2026-27-Q2');
    assert.equal(periodFromInput('quarterly', { period_year: 2026, period_month: 5, period_quarter: 2 }).ok, false);
  });
  test('yearly needs only a year; a month is rejected', () => {
    const r = periodFromInput('yearly', { period_year: 2025 });
    assert.ok(r.ok && r.period.key === 'FY2025-26');
    assert.equal(periodFromInput('yearly', { period_year: 2025, period_month: 3 }).ok, false);
  });
  test('half_yearly needs a key', () => {
    assert.equal(periodFromInput('half_yearly', { period_year: 2026 }).ok, false);
    assert.equal(periodFromInput('half_yearly', { period_key: 'FY2026-27-H1' }).ok, true);
  });
  test('a required period that is missing is rejected with a clear reason', () => {
    const r = periodFromInput('yearly', {});
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.reason, /financial year/i);
  });
});

describe('periodOptions', () => {
  const today = { year: 2026, month: 11 };
  test('none has no options', () => {
    assert.deepEqual(periodOptions('none', today), []);
  });
  test('monthly lists next month down to eighteen months back, newest first', () => {
    const o = periodOptions('monthly', today);
    assert.equal(o.length, 20);
    assert.equal(o[0].key, '2026-12');
    assert.equal(o[1].key, '2026-11');
    assert.equal(o[1].label, 'Nov 2026');
    assert.equal(o[19].key, '2025-05');
  });
  test('quarterly lists this and last financial year, newest first, with month ranges', () => {
    const o = periodOptions('quarterly', today);
    assert.equal(o.length, 8);
    assert.equal(o[0].key, 'FY2026-27-Q4');
    assert.equal(o[7].key, 'FY2025-26-Q1');
    assert.match(o[3].label, /Q1 FY 2026-27 \(Apr-Jun\)/);
  });
  test('half-yearly and yearly options', () => {
    assert.deepEqual(periodOptions('half_yearly', today).map((o) => o.key), ['FY2026-27-H2', 'FY2026-27-H1', 'FY2025-26-H2', 'FY2025-26-H1']);
    const y = periodOptions('yearly', today).map((o) => o.key);
    assert.equal(y[0], 'FY2027-28');
    assert.ok(y.includes('FY2026-27') && y.includes('FY2025-26'));
  });
  test('every option key parses back to the same period type', () => {
    for (const type of ['monthly', 'quarterly', 'half_yearly', 'yearly'] as const) {
      for (const o of periodOptions(type, today)) assert.equal(parsePeriodKey(o.key)?.type, type);
    }
  });
});

describe('defaultPeriodKey (the period that has just ended)', () => {
  test('monthly', () => {
    assert.equal(defaultPeriodKey('monthly', { year: 2026, month: 11 }), '2026-10');
    assert.equal(defaultPeriodKey('monthly', { year: 2026, month: 1 }), '2025-12');
  });
  test('quarterly', () => {
    assert.equal(defaultPeriodKey('quarterly', { year: 2026, month: 11 }), 'FY2026-27-Q2');
    assert.equal(defaultPeriodKey('quarterly', { year: 2026, month: 4 }), 'FY2025-26-Q4');
    assert.equal(defaultPeriodKey('quarterly', { year: 2027, month: 2 }), 'FY2026-27-Q3');
  });
  test('half-yearly', () => {
    assert.equal(defaultPeriodKey('half_yearly', { year: 2026, month: 11 }), 'FY2026-27-H1');
    assert.equal(defaultPeriodKey('half_yearly', { year: 2026, month: 4 }), 'FY2025-26-H2');
  });
  test('yearly', () => {
    assert.equal(defaultPeriodKey('yearly', { year: 2026, month: 11 }), 'FY2025-26');
    assert.equal(defaultPeriodKey('yearly', { year: 2026, month: 3 }), 'FY2024-25');
  });
  test('none has no default', () => {
    assert.equal(defaultPeriodKey('none', { year: 2026, month: 11 }), null);
  });
});
