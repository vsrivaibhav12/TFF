import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { taskTiles, tileFilterOpts, tileIsActive, tileHref, statusSplitWidths } from '../lib/tasks/tiles';

const dates = { todayIso: '2026-11-11', weekEndIso: '2026-11-18', yesterdayIso: '2026-11-10' };
const tilesFor = (isAdmin: boolean) => taskTiles({ ...dates, isAdmin });
const tile = (key: string, isAdmin = true) => tilesFor(isAdmin).find((t) => t.key === key)!;

describe('taskTiles', () => {
  test('team members get six tiles, admins also see unassigned', () => {
    assert.deepEqual(tilesFor(false).map((t) => t.key), ['open', 'overdue', 'today', 'week', 'waiting', 'verify']);
    assert.deepEqual(tilesFor(true).map((t) => t.key), ['open', 'overdue', 'today', 'week', 'waiting', 'verify', 'unassigned']);
  });
});

describe('tileFilterOpts', () => {
  test('open is the default scope', () => {
    const o = tileFilterOpts(tile('open'), {});
    assert.deepEqual(o.status, ['pending', 'in_progress']);
    assert.equal(o.dueTo, undefined);
  });
  test('overdue ends yesterday, still among open tasks', () => {
    const o = tileFilterOpts(tile('overdue'), {});
    assert.equal(o.dueTo, '2026-11-10');
    assert.deepEqual(o.status, ['pending', 'in_progress']);
  });
  test('today and this week', () => {
    const t = tileFilterOpts(tile('today'), {});
    assert.deepEqual([t.dueFrom, t.dueTo], ['2026-11-11', '2026-11-11']);
    const w = tileFilterOpts(tile('week'), {});
    assert.deepEqual([w.dueFrom, w.dueTo], ['2026-11-11', '2026-11-18']);
  });
  test('waiting on client uses the blocked status', () => {
    assert.deepEqual(tileFilterOpts(tile('waiting'), {}).status, ['blocked']);
  });
  test('to verify means completed and awaiting verification', () => {
    const o = tileFilterOpts(tile('verify'), {});
    assert.deepEqual(o.status, ['completed']);
    assert.equal(o.verificationStatus, 'pending');
  });
  test('unassigned', () => {
    assert.equal(tileFilterOpts(tile('unassigned'), {}).assignedTo, 'unassigned');
  });
  test('the counts keep the filters already applied but replace the tile scope', () => {
    const o = tileFilterOpts(tile('overdue'), { client: 'c1', assigned: 'u1', status: 'completed', due_from: '2026-01-01', due_to: '2026-12-31' });
    assert.equal(o.clientId, 'c1');
    assert.equal(o.assignedTo, 'u1');
    assert.deepEqual(o.status, ['pending', 'in_progress']);
    assert.equal(o.dueFrom, undefined);
    assert.equal(o.dueTo, '2026-11-10');
  });
});

describe('tileIsActive and tileHref', () => {
  test('open is active only when no scope filter is set', () => {
    assert.equal(tileIsActive(tile('open'), {}), true);
    assert.equal(tileIsActive(tile('open'), { due_to: '2026-11-10' }), false);
    assert.equal(tileIsActive(tile('open'), { status: 'completed' }), false);
    assert.equal(tileIsActive(tile('open'), { client: 'c1' }), true);
  });
  test('other tiles are active when their parameters match', () => {
    assert.equal(tileIsActive(tile('overdue'), { due_to: '2026-11-10' }), true);
    assert.equal(tileIsActive(tile('overdue'), { due_to: '2026-11-10', due_from: '2026-11-01' }), false);
    assert.equal(tileIsActive(tile('waiting'), { status: 'blocked' }), true);
    assert.equal(tileIsActive(tile('waiting'), { status: 'pending' }), false);
  });
  test('selecting a tile keeps other filters, drops the old scope and resets the page', () => {
    const href = tileHref(tile('overdue'), { client: 'c1', status: 'completed', due_from: '2026-01-01', page: '3' }, '/admin/tasks');
    assert.equal(href, '/admin/tasks?client=c1&due_to=2026-11-10');
  });
  test('selecting the active tile again clears it', () => {
    const href = tileHref(tile('overdue'), { client: 'c1', due_to: '2026-11-10' }, '/admin/tasks');
    assert.equal(href, '/admin/tasks?client=c1');
  });
  test('open clears the scope and nothing else', () => {
    assert.equal(tileHref(tile('open'), { due_to: '2026-11-10', status: 'blocked', q: 'acme' }, '/team/tasks'), '/team/tasks?q=acme');
  });
});

describe('statusSplitWidths', () => {
  test('percentages of the total, rounded so they add up', () => {
    assert.deepEqual(statusSplitWidths({ pending: 150, in_progress: 106, completed: 56 }), { pending: 48, in_progress: 34, completed: 18 });
  });
  test('an empty list has no widths', () => {
    assert.deepEqual(statusSplitWidths({ pending: 0, in_progress: 0, completed: 0 }), { pending: 0, in_progress: 0, completed: 0 });
  });
  test('the parts always add up to 100', () => {
    const w = statusSplitWidths({ pending: 1, in_progress: 1, completed: 1 });
    assert.equal(w.pending + w.in_progress + w.completed, 100);
  });
});
