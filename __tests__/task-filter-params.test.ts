import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseTaskFilterParams, effectiveStatuses, statusParamFor, sameSet } from '../lib/tasks/filter-params';

describe('parseTaskFilterParams', () => {
  it('returns empty lists and undefined scalars for no params, with open tasks as the default status', () => {
    const o = parseTaskFilterParams({});
    assert.deepEqual(o.status, ['pending', 'in_progress']);
    assert.deepEqual(o.priority, []);
    assert.equal(o.assignedTo, undefined);
    assert.equal(o.isStuck, undefined);
    assert.equal(o.labels, undefined);
  });

  it('splits comma lists and ignores empty segments', () => {
    const o = parseTaskFilterParams({ status: 'pending,,in_progress', priority: 'high' });
    assert.deepEqual(o.status, ['pending', 'in_progress']);
    assert.deepEqual(o.priority, ['high']);
  });

  it('reads tri-state flags as true, false or undefined', () => {
    assert.equal(parseTaskFilterParams({ is_stuck: 'true' }).isStuck, true);
    assert.equal(parseTaskFilterParams({ is_billable: 'false' }).isBillable, false);
    assert.equal(parseTaskFilterParams({ is_verified: 'maybe' }).isVerified, undefined);
  });

  it('accepts one label or many', () => {
    assert.deepEqual(parseTaskFilterParams({ label: 'urgent' }).labels, ['urgent']);
    assert.deepEqual(parseTaskFilterParams({ label: ['a', 'b'] }).labels, ['a', 'b']);
  });

  it('parses numeric period fields and maps client and assignee', () => {
    const o = parseTaskFilterParams({ period_year: '2026', period_month: '4', client: 'c1', assigned: 'u1', sub_service: 's1' });
    assert.equal(o.periodYear, 2026);
    assert.equal(o.periodMonth, 4);
    assert.equal(o.clientId, 'c1');
    assert.equal(o.assignedTo, 'u1');
    assert.deepEqual(o.subServiceIds, ['s1']);
  });
});

describe('task status selection', () => {
  it('defaults to pending and in progress when the parameter is missing, empty or unusable', () => {
    assert.deepEqual(effectiveStatuses(undefined), ['pending', 'in_progress']);
    assert.deepEqual(effectiveStatuses(''), ['pending', 'in_progress']);
    assert.deepEqual(effectiveStatuses('overdue'), ['pending', 'in_progress']);
  });

  it('accepts any combination and drops unknown values and duplicates', () => {
    assert.deepEqual(effectiveStatuses('completed,cancelled'), ['completed', 'cancelled']);
    assert.deepEqual(effectiveStatuses('pending,bogus,pending,stuck'), ['pending', 'stuck']);
  });

  it('keeps the default out of the URL', () => {
    assert.equal(statusParamFor(['pending', 'in_progress']), '');
    assert.equal(statusParamFor(['in_progress', 'pending']), '');
    assert.equal(statusParamFor(['pending']), 'pending');
    assert.equal(statusParamFor(['pending', 'in_progress', 'completed']), 'pending,in_progress,completed');
  });

  it('feeds the repository filter', () => {
    assert.deepEqual(parseTaskFilterParams({ status: 'completed,cancelled' }).status, ['completed', 'cancelled']);
    assert.ok(sameSet(['a', 'b'], ['b', 'a']));
  });
});
