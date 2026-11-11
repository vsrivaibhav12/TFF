import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysIso,
  workloadByAssignee,
  ageingBuckets,
  weekStrip,
  isAboveAverage,
  sumUnbilled,
  formatInrCompact,
  type SlimTask,
} from '../lib/services/home-metrics';

const today = '2026-11-11';
const t = (over: Partial<SlimTask> = {}): SlimTask => ({ id: 'x', assigned_to: 'u1', due_date: null, is_blocked_on_client: false, updated_at: null, ...over });

describe('addDaysIso', () => {
  test('adds and subtracts across month and year ends', () => {
    assert.equal(addDaysIso('2026-11-11', 7), '2026-11-18');
    assert.equal(addDaysIso('2026-12-30', 3), '2027-01-02');
    assert.equal(addDaysIso('2026-03-01', -1), '2026-02-28');
  });
});

describe('workloadByAssignee', () => {
  test('splits each person open tasks into overdue, due this week and on track', () => {
    const rows = workloadByAssignee([
      t({ id: 'a', assigned_to: 'u1', due_date: '2026-11-10' }),
      t({ id: 'b', assigned_to: 'u1', due_date: '2026-11-11' }),
      t({ id: 'c', assigned_to: 'u1', due_date: '2026-11-18' }),
      t({ id: 'd', assigned_to: 'u1', due_date: '2026-11-19' }),
      t({ id: 'e', assigned_to: 'u1', due_date: null }),
      t({ id: 'f', assigned_to: 'u2', due_date: '2026-11-01' }),
    ], today);
    const u1 = rows.find((r) => r.user_id === 'u1')!;
    assert.deepEqual([u1.open, u1.overdue, u1.dueSoon, u1.onTrack], [5, 1, 2, 2]);
    const u2 = rows.find((r) => r.user_id === 'u2')!;
    assert.deepEqual([u2.open, u2.overdue, u2.dueSoon, u2.onTrack], [1, 1, 0, 0]);
  });
  test('unassigned tasks are left out and the busiest person comes first', () => {
    const rows = workloadByAssignee([t({ assigned_to: null }), t({ id: '1', assigned_to: 'a' }), t({ id: '2', assigned_to: 'b' }), t({ id: '3', assigned_to: 'b' })], today);
    assert.deepEqual(rows.map((r) => r.user_id), ['b', 'a']);
  });
});

describe('ageingBuckets', () => {
  test('counts blocked tasks by days since their last update', () => {
    const r = ageingBuckets([
      t({ is_blocked_on_client: true, updated_at: '2026-11-10T08:00:00' }),
      t({ is_blocked_on_client: true, updated_at: '2026-11-08T08:00:00' }),
      t({ is_blocked_on_client: true, updated_at: '2026-11-06T08:00:00' }),
      t({ is_blocked_on_client: true, updated_at: '2026-10-20T08:00:00' }),
      t({ is_blocked_on_client: false, updated_at: '2026-10-01T08:00:00' }),
      t({ is_blocked_on_client: true, updated_at: null }),
    ], today);
    assert.deepEqual(r, { d0_3: 2, d4_7: 1, d8_plus: 2 });
  });
});

describe('weekStrip', () => {
  test('one entry per day starting today, with that day\'s task count', () => {
    const strip = weekStrip([t({ due_date: '2026-11-11' }), t({ due_date: '2026-11-11' }), t({ due_date: '2026-11-13' }), t({ due_date: '2026-11-30' })], today, 4);
    assert.deepEqual(strip.map((d) => [d.date, d.weekday, d.count]), [
      ['2026-11-11', 'Wed', 2], ['2026-11-12', 'Thu', 0], ['2026-11-13', 'Fri', 1], ['2026-11-14', 'Sat', 0],
    ]);
  });
});

describe('isAboveAverage', () => {
  test('flags someone well above the team average', () => {
    assert.equal(isAboveAverage(31, 20), true);
    assert.equal(isAboveAverage(24, 20), false);
  });
  test('small numbers are never flagged', () => {
    assert.equal(isAboveAverage(4, 2), false);
  });
});

describe('sumUnbilled', () => {
  test('counts tasks and adds up amounts, treating missing amounts as zero', () => {
    assert.deepEqual(sumUnbilled([{ bill_amount: 1000 }, { bill_amount: null }, { bill_amount: 250.5 }]), { count: 3, amount: 1250.5 });
    assert.deepEqual(sumUnbilled([]), { count: 0, amount: 0 });
  });
});

describe('formatInrCompact', () => {
  test('Indian lakh and crore', () => {
    assert.equal(formatInrCompact(0), '₹0');
    assert.equal(formatInrCompact(99999), '₹99,999');
    assert.equal(formatInrCompact(184000), '₹1.84L');
    assert.equal(formatInrCompact(250000), '₹2.5L');
    assert.equal(formatInrCompact(12000000), '₹1.2Cr');
  });
});
