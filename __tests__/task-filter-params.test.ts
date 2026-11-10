import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseTaskFilterParams } from '../lib/tasks/filter-params';

describe('parseTaskFilterParams', () => {
  it('returns empty lists and undefined scalars for no params', () => {
    const o = parseTaskFilterParams({});
    assert.deepEqual(o.status, []);
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
