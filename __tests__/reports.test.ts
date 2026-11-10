import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRange, rangeForPreset, workingDays, addDays, isIsoDate, MAX_RANGE_DAYS } from '../lib/reports/date-range';
import { summariseAttendance, hoursWorked, parseTimestamp } from '../lib/services/attendance-report';
import { summariseWorkDone, formatMinutes, type WorkDoneEntry } from '../lib/services/workdone-report';

describe('date-range presets', () => {
  it('this month and last month', () => {
    assert.deepEqual(rangeForPreset('this_month', '2026-11-10'), { from: '2026-11-01', to: '2026-11-30' });
    assert.deepEqual(rangeForPreset('last_month', '2026-01-15'), { from: '2025-12-01', to: '2025-12-31' });
  });

  it('financial year runs April to March', () => {
    assert.deepEqual(rangeForPreset('this_fy', '2026-11-10'), { from: '2026-04-01', to: '2027-03-31' });
    assert.deepEqual(rangeForPreset('this_fy', '2026-02-10'), { from: '2025-04-01', to: '2026-03-31' });
    assert.deepEqual(rangeForPreset('last_fy', '2026-11-10'), { from: '2025-04-01', to: '2026-03-31' });
  });

  it('quarter and rolling windows', () => {
    assert.deepEqual(rangeForPreset('this_quarter', '2026-11-10'), { from: '2026-10-01', to: '2026-12-31' });
    assert.deepEqual(rangeForPreset('last7', '2026-11-10'), { from: '2026-11-04', to: '2026-11-10' });
    assert.deepEqual(rangeForPreset('today', '2026-11-10'), { from: '2026-11-10', to: '2026-11-10' });
  });
});

describe('resolveRange', () => {
  const today = '2026-11-10';
  it('defaults to this month', () => {
    const r = resolveRange({}, today);
    assert.equal(r.preset, 'this_month');
    assert.equal(r.from, '2026-11-01');
  });
  it('uses a known preset', () => {
    assert.equal(resolveRange({ range: 'last30' }, today).preset, 'last30');
  });
  it('ignores an unknown preset', () => {
    assert.equal(resolveRange({ range: 'nonsense' }, today).preset, 'this_month');
  });
  it('custom range wins and swaps reversed dates', () => {
    const r = resolveRange({ from: '2026-05-10', to: '2026-05-01', range: 'today' }, today);
    assert.equal(r.preset, 'custom');
    assert.equal(r.from, '2026-05-01');
    assert.equal(r.to, '2026-05-10');
  });
  it('rejects invalid dates', () => {
    assert.equal(resolveRange({ from: '2026-13-40', to: '2026-05-01' }, today).preset, 'this_month');
    assert.equal(isIsoDate('2026-02-30'), false);
  });
  it('shortens ranges that are too long', () => {
    const r = resolveRange({ from: '2020-01-01', to: '2026-01-01' }, today);
    assert.equal(r.clamped, true);
    assert.equal(r.to, '2026-01-01');
    assert.equal(r.from, addDays('2026-01-01', -(MAX_RANGE_DAYS - 1)));
  });
});

describe('workingDays', () => {
  it('skips Sundays', () => {
    // 2026-11-02 is a Monday; 2026-11-08 is a Sunday.
    const d = workingDays('2026-11-02', '2026-11-08');
    assert.equal(d.length, 6);
    assert.ok(!d.includes('2026-11-08'));
  });
  it('stops at today', () => {
    assert.deepEqual(workingDays('2026-11-02', '2026-11-30', '2026-11-04'), ['2026-11-02', '2026-11-03', '2026-11-04']);
  });
});

describe('attendance summary', () => {
  const range = { from: '2026-11-02', to: '2026-11-07' }; // Mon to Sat, 6 working days
  const members = [{ id: 'a', name: 'Asha' }, { id: 'b', name: 'Bala' }];
  const logs = [
    { user_id: 'a', attendance_date: '2026-11-02', status: 'present', check_in_time: '2026-11-02T04:00:00Z', check_out_time: '2026-11-02T12:00:00Z' },
    { user_id: 'a', attendance_date: '2026-11-03', status: 'work_from_home', check_in_time: null, check_out_time: null },
    { user_id: 'a', attendance_date: '2026-11-04', status: 'leave', check_in_time: null, check_out_time: null },
    { user_id: 'b', attendance_date: '2026-11-02', status: 'present', check_in_time: '2026-11-02T04:00:00Z', check_out_time: '2026-11-02T10:30:00Z' },
  ];

  it('counts statuses, hours and unmarked days', () => {
    const { members: out } = summariseAttendance(members, logs, range, '2026-11-30');
    const a = out.find((m) => m.user_id === 'a')!;
    assert.equal(a.present, 1);
    assert.equal(a.work_from_home, 1);
    assert.equal(a.leave, 1);
    assert.equal(a.working_days, 6);
    assert.equal(a.not_marked, 3);
    assert.equal(a.total_hours, 8);
    assert.equal(a.avg_hours, 8);
    // 2 attended out of 5 non-leave working days
    assert.equal(a.rate, 40);
    const b = out.find((m) => m.user_id === 'b')!;
    assert.equal(b.total_hours, 6.5);
  });

  it('only counts working days up to today', () => {
    const { members: out } = summariseAttendance(members, logs, range, '2026-11-03');
    assert.equal(out[0].working_days, 2);
  });

  it('keeps history for people no longer in the member list', () => {
    const { members: out } = summariseAttendance([], [logs[0]], range, '2026-11-30');
    assert.equal(out.length, 1);
    assert.equal(out[0].name, 'Former member');
  });

  it('totals add up', () => {
    const { totals } = summariseAttendance(members, logs, range, '2026-11-30');
    assert.equal(totals.present, 2);
    assert.equal(totals.working_days, 12);
  });

  it('hoursWorked handles missing and reversed times', () => {
    assert.equal(hoursWorked(null, '2026-11-02T10:00:00Z'), null);
    assert.equal(hoursWorked('2026-11-02T10:00:00Z', '2026-11-02T09:00:00Z'), null);
    assert.equal(hoursWorked('2026-11-02T04:00:00', '2026-11-02T06:00:00'), 2);
    assert.equal(parseTimestamp('not a date'), null);
  });
});

describe('work done summary', () => {
  const row = (o: Partial<WorkDoneEntry>): WorkDoneEntry => ({
    id: 'x', work_date: '2026-11-02', duration_minutes: 60, note: null, entry_method: 'manual',
    user_id: 'a', user_name: 'Asha', client_id: 'c1', client_name: 'Acme', task_id: 't1', task_title: 'GST return', ...o,
  });

  it('aggregates by member, client, task and day', () => {
    const s = summariseWorkDone([
      row({ id: '1', duration_minutes: 90 }),
      row({ id: '2', duration_minutes: 30, user_id: 'b', user_name: 'Bala', client_id: 'c2', client_name: 'Zen', task_id: 't2', task_title: 'TDS' }),
      row({ id: '3', duration_minutes: 60, work_date: '2026-11-03' }),
    ]);
    assert.equal(s.total_minutes, 180);
    assert.equal(s.entries, 3);
    assert.equal(s.active_days, 2);
    assert.equal(s.avg_minutes_per_active_day, 90);
    assert.equal(s.members, 2);
    assert.equal(s.clients, 2);
    assert.equal(s.by_member[0].name, 'Asha');
    assert.equal(s.by_member[0].minutes, 150);
    assert.deepEqual(s.by_day.map((d) => d.date), ['2026-11-02', '2026-11-03']);
  });

  it('handles empty input and entries with no client', () => {
    const e = summariseWorkDone([]);
    assert.equal(e.total_minutes, 0);
    assert.equal(e.avg_minutes_per_active_day, 0);
    const n = summariseWorkDone([row({ client_id: null, client_name: 'No client', task_id: null })]);
    assert.equal(n.clients, 0);
    assert.equal(n.by_task.length, 0);
  });

  it('formats minutes', () => {
    assert.equal(formatMinutes(0), '0m');
    assert.equal(formatMinutes(45), '45m');
    assert.equal(formatMinutes(120), '2h');
    assert.equal(formatMinutes(150), '2h 30m');
  });
});
