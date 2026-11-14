import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildFilings, buildClientRows, expectedPerClient, taskStatusKey, totalsOf, type OverviewTask, type LinkedClient } from '../lib/services/compliance-overview';
import { periodBounds, periodLabel, periodStep } from '../lib/services/compliance-progress';

const today = '2026-11-14';
const task = (o: Partial<OverviewTask>): OverviewTask => ({
  id: Math.random().toString(36).slice(2), client_id: 'c1', client_name: 'Acme', assignee_id: null, assignee_name: 'Sathya',
  sub_service_id: 's1', sub_service_name: 'GSTR-1', period_type: 'monthly', due_date: '2026-11-11', status: 'pending', is_stuck: false, completed_date: null, ...o,
});
const link = (client_id: string, o: Partial<LinkedClient> = {}): LinkedClient => ({
  sub_service_id: 's1', sub_service_name: 'GSTR-1', period_type: 'monthly', client_id, client_name: `Client ${client_id}`, ...o,
});

describe('financial year window', () => {
  test('bounds and label', () => {
    assert.deepEqual(periodBounds('year', '2026-11'), { from: '2026-04-01', to: '2027-03-31' });
    assert.deepEqual(periodBounds('year', '2027-02'), { from: '2026-04-01', to: '2027-03-31' });
    assert.equal(periodLabel('year', '2026-11'), 'FY 2026-27');
    assert.equal(periodStep('year'), 12);
  });
});

describe('taskStatusKey', () => {
  test('overdue beats waiting and in progress', () => {
    assert.equal(taskStatusKey({ status: 'completed', is_stuck: false, due_date: '2026-01-01' }, today), 'done');
    assert.equal(taskStatusKey({ status: 'in_progress', is_stuck: false, due_date: '2026-11-01' }, today), 'overdue');
    assert.equal(taskStatusKey({ status: 'blocked', is_stuck: false, due_date: '2026-11-30' }, today), 'waiting');
    assert.equal(taskStatusKey({ status: 'pending', is_stuck: true, due_date: '2026-11-30' }, today), 'overdue');
    assert.equal(taskStatusKey({ status: 'pending', is_stuck: false, due_date: '2026-11-30' }, today), 'not_started');
  });
});

describe('expectedPerClient', () => {
  test('only where the window is exactly one period of the service', () => {
    assert.equal(expectedPerClient('monthly', 'month'), 1);
    assert.equal(expectedPerClient('quarterly', 'quarter'), 1);
    assert.equal(expectedPerClient('yearly', 'year'), 1);
    assert.equal(expectedPerClient('monthly', 'quarter'), null);
    assert.equal(expectedPerClient('monthly', 'year'), null);
    assert.equal(expectedPerClient('quarterly', 'month'), null);
    assert.equal(expectedPerClient('none', 'year'), null);
  });
});

describe('buildFilings', () => {
  test('clients linked without a task count as missing and lower the percentage', () => {
    const f = buildFilings(
      [task({ client_id: 'c1', status: 'completed', completed_date: '2026-11-10' }), task({ client_id: 'c2', status: 'in_progress', due_date: '2026-11-25' })],
      [link('c1'), link('c2'), link('c3'), link('c4')],
      'month', today,
    )[0];
    assert.deepEqual([f.tasks, f.done, f.inProgress, f.missing, f.expected, f.pct], [2, 1, 1, 2, 4, 25]);
    assert.deepEqual(f.missingClients.map((c) => c.id), ['c3', 'c4']);
  });
  test('a monthly filing over a quarter is counted from its tasks only', () => {
    const f = buildFilings([task({}), task({})], [link('c1'), link('c2')], 'quarter', today)[0];
    assert.equal(f.missing, null);
    assert.deepEqual(f.missingClients, []);
    assert.equal(f.expected, 2);
  });
  test('a filing with no fixed expectation is counted from its tasks only', () => {
    const f = buildFilings([task({ period_type: 'yearly', status: 'completed' })], [link('c1', { period_type: 'yearly' })], 'month', today)[0];
    assert.equal(f.missing, null);
    assert.equal(f.expected, 1);
    assert.equal(f.pct, 100);
  });
  test('a filing with linked clients and no tasks still appears', () => {
    const f = buildFilings([], [link('c1'), link('c2')], 'month', today);
    assert.equal(f.length, 1);
    assert.equal(f[0].pct, 0);
    assert.equal(f[0].missing, 2);
  });
  test('least complete filing comes first', () => {
    const f = buildFilings(
      [task({ sub_service_id: 'a', sub_service_name: 'A', status: 'completed' }), task({ sub_service_id: 'b', sub_service_name: 'B' })],
      [], 'month', today,
    );
    assert.deepEqual(f.map((x) => x.name), ['B', 'A']);
  });
});

describe('totalsOf and buildClientRows', () => {
  test('totals add up across filings', () => {
    const filings = buildFilings([task({ status: 'completed', completed_date: '2026-11-12' }), task({ client_id: 'c2' })], [link('c1'), link('c2'), link('c3')], 'month', today);
    const t = totalsOf(filings);
    assert.deepEqual([t.expected, t.done, t.overdue, t.missing, t.pct, t.onTimePct], [3, 1, 1, 1, 33, 0]);
  });
  test('rows list tasks then missing clients, overdue first, and can be narrowed to one filing', () => {
    const tasks = [task({ client_id: 'c1', status: 'completed', completed_date: '2026-11-10' }), task({ client_id: 'c2' })];
    const filings = buildFilings(tasks, [link('c1'), link('c2'), link('c3')], 'month', today);
    const rows = buildClientRows(tasks, filings, today);
    assert.deepEqual(rows.map((r) => r.status), ['overdue', 'missing', 'done']);
    assert.equal(buildClientRows(tasks, filings, today, 'other').length, 0);
    assert.equal(rows[1].task_id, null);
  });
});
