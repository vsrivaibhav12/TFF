import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { periodBounds, shiftMonth, summariseProgress, isMonthKey, type ProgressEvent } from '../lib/services/compliance-progress';

const ev = (o: Partial<ProgressEvent>): ProgressEvent => ({
  rule_code: 'GSTR1', rule_name: 'GSTR-1', due_date: '2026-11-11', status: 'upcoming', task_id: null, task_status: null, ...o,
});

describe('periodBounds', () => {
  test('a month', () => {
    assert.deepEqual(periodBounds('month', '2026-02'), { from: '2026-02-01', to: '2026-02-28' });
  });
  test('fiscal quarters start in April, July, October and January', () => {
    assert.deepEqual(periodBounds('quarter', '2026-05'), { from: '2026-04-01', to: '2026-06-30' });
    assert.deepEqual(periodBounds('quarter', '2026-11'), { from: '2026-10-01', to: '2026-12-31' });
    assert.deepEqual(periodBounds('quarter', '2027-02'), { from: '2027-01-01', to: '2027-03-31' });
  });
});

describe('shiftMonth and isMonthKey', () => {
  test('crosses year ends', () => {
    assert.equal(shiftMonth('2026-12', 1), '2027-01');
    assert.equal(shiftMonth('2026-01', -1), '2025-12');
  });
  test('validates keys', () => {
    assert.equal(isMonthKey('2026-11'), true);
    assert.equal(isMonthKey('2026-13'), false);
    assert.equal(isMonthKey(undefined), false);
  });
});

describe('summariseProgress', () => {
  const today = '2026-11-14';
  test('counts completed, in progress, not started and overdue', () => {
    const rows = summariseProgress([
      ev({ task_id: 't1', task_status: 'completed' }),
      ev({ task_id: 't2', task_status: 'in_progress', due_date: '2026-11-20' }),
      ev({ due_date: '2026-11-25' }),
      ev({ task_id: 't3', task_status: 'pending' }),
      ev({ status: 'dismissed' }),
    ], today);
    assert.equal(rows.length, 1);
    assert.deepEqual(
      [rows[0].total, rows[0].completed, rows[0].inProgress, rows[0].notStarted, rows[0].overdue, rows[0].pct],
      [4, 1, 1, 1, 1, 25],
    );
  });
  test('least complete filing comes first', () => {
    const rows = summariseProgress([
      ev({ rule_code: 'A', rule_name: 'A', task_id: 't', task_status: 'completed' }),
      ev({ rule_code: 'B', rule_name: 'B' }),
    ], today);
    assert.deepEqual(rows.map((r) => r.rule_code), ['B', 'A']);
  });
  test('no events gives no rows', () => {
    assert.deepEqual(summariseProgress([], today), []);
  });
});
