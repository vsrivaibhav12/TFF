import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createDeadlineTasks, type CreateDeps } from '../lib/services/deadline-create';
import type { PlanClientInput } from '../lib/services/deadline-plan';

const sub = { id: 's1', code: 'GSTR1', name: 'GSTR-1', frequency: 'monthly', period_type: 'monthly', due_day_of_month: 11, due_day_of_quarter: null, due_month: null };

const client = (id: string, over: Partial<PlanClientInput> = {}): PlanClientInput => ({
  client_id: id, business_name: `Client ${id}`, group_name: null, default_assignee_id: null,
  gst_filing_frequency: null, profile: null, existing_task_id: null, ...over,
});

function deps(clients: PlanClientInput[], over: Partial<CreateDeps> = {}): CreateDeps & { calls: Array<Parameters<CreateDeps['createRows']>[0]> } {
  const calls: Array<Parameters<CreateDeps['createRows']>[0]> = [];
  return {
    subService: sub,
    rules: [],
    todayIso: '2026-10-05',
    override: null,
    listClients: async () => clients,
    createRows: async (args) => {
      calls.push(args);
      return { created: args.rows.map((r) => ({ client_id: r.client_id, task_id: `t-${r.client_id}`, task_number: `T-26-${r.client_id}` })), failed: [] };
    },
    calls,
    ...over,
  };
}

const input = (rows: Array<{ client_id: string; assigned_to: string | null }>, due_date: string | null = null) => ({
  sub_service_id: 's1', period_key: '2026-10', due_date, priority: 'medium' as const, rows,
});

describe('createDeadlineTasks', () => {
  test('creates ready clients with titles, period columns and the deadline date', async () => {
    const d = deps([client('a'), client('b')]);
    const r = await createDeadlineTasks(d, input([{ client_id: 'a', assigned_to: 'u1' }, { client_id: 'b', assigned_to: 'u2' }]));
    assert.ok(r.ok);
    assert.equal(d.calls.length, 1);
    const call = d.calls[0];
    assert.equal(call.due_date, '2026-11-11');
    assert.equal(call.period_key, '2026-10');
    assert.equal(call.period_type, 'monthly');
    assert.equal(call.period_year, 2026);
    assert.equal(call.period_month, 10);
    assert.equal(call.period_quarter, null);
    assert.deepEqual(call.rows.map((x) => x.title), ['GSTR-1 — Client a — Oct 2026', 'GSTR-1 — Client b — Oct 2026']);
    if (r.ok) assert.equal(r.result.created.length, 2);
  });

  test('clients that already have a task or do not apply are skipped without reaching the database', async () => {
    const d = deps([client('a', { existing_task_id: 't0' }), client('b', { gst_filing_frequency: 'qrmp' }), client('c')], {
      subService: { ...sub, period_type: 'gst_frequency' },
    });
    const r = await createDeadlineTasks(d, input([
      { client_id: 'a', assigned_to: 'u1' }, { client_id: 'b', assigned_to: 'u1' }, { client_id: 'c', assigned_to: 'u1' },
    ]));
    assert.ok(r.ok);
    assert.deepEqual(d.calls[0].rows.map((x) => x.client_id), ['c']);
    if (r.ok) {
      assert.deepEqual(r.result.skipped.map((s) => s.client_id), ['a', 'b']);
      assert.match(r.result.skipped[0].reason, /already has a task/);
    }
  });

  test('a row without an assignee is reported, not created', async () => {
    const d = deps([client('a'), client('b')]);
    const r = await createDeadlineTasks(d, input([{ client_id: 'a', assigned_to: null }, { client_id: 'b', assigned_to: 'u1' }]));
    assert.ok(r.ok);
    assert.deepEqual(d.calls[0].rows.map((x) => x.client_id), ['b']);
    if (r.ok) {
      assert.equal(r.result.failed[0].client_id, 'a');
      assert.match(r.result.failed[0].reason, /assign/i);
    }
  });

  test('a client that is not linked to the service is reported', async () => {
    const d = deps([client('a')]);
    const r = await createDeadlineTasks(d, input([{ client_id: 'zzz', assigned_to: 'u1' }]));
    assert.ok(r.ok);
    assert.equal(d.calls.length, 0);
    if (r.ok) assert.match(r.result.failed[0].reason, /not linked/i);
  });

  test('database failures are returned by client name', async () => {
    const d = deps([client('a')], {
      createRows: async () => ({ created: [], failed: [{ client_id: 'a', reason: 'boom' }] }),
    });
    const r = await createDeadlineTasks(d, input([{ client_id: 'a', assigned_to: 'u1' }]));
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(r.result.failed, [{ client_id: 'a', client_name: 'Client a', reason: 'boom' }]);
  });

  test('an explicit due date wins; with none anywhere it is an error', async () => {
    const d = deps([client('a')]);
    const r = await createDeadlineTasks(d, input([{ client_id: 'a', assigned_to: 'u1' }], '2026-11-20'));
    assert.ok(r.ok);
    assert.equal(d.calls[0].due_date, '2026-11-20');

    const none = deps([client('a')], { subService: { ...sub, frequency: 'on_demand', due_day_of_month: null } });
    const e = await createDeadlineTasks(none, input([{ client_id: 'a', assigned_to: 'u1' }]));
    assert.equal(e.ok, false);
    if (!e.ok) assert.match(e.reason, /due date/i);
  });

  test('a due date in the past is refused, because a task cannot be due before it is created', async () => {
    const d = deps([client('a')]);
    const r = await createDeadlineTasks(d, input([{ client_id: 'a', assigned_to: 'u1' }], '2026-10-04'));
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.reason, /today or a later date/i);
    assert.equal(d.calls.length, 0);
  });

  test('the deadline date is used even when it has passed, by moving the task date to today', async () => {
    const d = deps([client('a')], { todayIso: '2026-11-20' });
    const r = await createDeadlineTasks(d, input([{ client_id: 'a', assigned_to: 'u1' }]));
    assert.ok(r.ok);
    assert.equal(d.calls[0].due_date, '2026-11-20');
  });

  test('nothing to create returns an empty result without calling the database', async () => {
    const d = deps([client('a', { existing_task_id: 't' })]);
    const r = await createDeadlineTasks(d, input([{ client_id: 'a', assigned_to: 'u1' }]));
    assert.ok(r.ok);
    assert.equal(d.calls.length, 0);
  });

  test('rejects an invalid period', async () => {
    const d = deps([]);
    const r = await createDeadlineTasks(d, { ...input([]), period_key: 'bad' });
    assert.equal(r.ok, false);
  });
});
