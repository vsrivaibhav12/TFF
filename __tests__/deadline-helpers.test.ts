import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { periodEndIso, makeMonthly, makeQuarterly, makeHalfYearly, makeYearly, NO_PERIOD } from '../lib/periods';
import { nudgeReason } from '../lib/services/deadline-nudge';
import { splitByWorkload } from '../lib/services/assignment-split';
import { canGrantCapability, SUPER_ADMIN_ONLY_CAPABILITIES } from '../lib/auth/capability-grant';

describe('periodEndIso', () => {
  test('last day of each kind of period', () => {
    assert.equal(periodEndIso(makeMonthly(2026, 10)), '2026-10-31');
    assert.equal(periodEndIso(makeMonthly(2028, 2)), '2028-02-29');
    assert.equal(periodEndIso(makeQuarterly(2026, 2)), '2026-09-30');
    assert.equal(periodEndIso(makeQuarterly(2026, 4)), '2027-03-31');
    assert.equal(periodEndIso(makeHalfYearly(2026, 1)), '2026-09-30');
    assert.equal(periodEndIso(makeHalfYearly(2026, 2)), '2027-03-31');
    assert.equal(periodEndIso(makeYearly(2025)), '2026-03-31');
    assert.equal(periodEndIso(NO_PERIOD), null);
  });
});

describe('nudgeReason', () => {
  test('the day after the period ends the period has opened', () => {
    assert.equal(nudgeReason({ periodEnd: '2026-10-31', dueDate: '2026-11-11', today: '2026-11-01' }), 'opened');
  });
  test('seven days before the due date', () => {
    assert.equal(nudgeReason({ periodEnd: '2026-10-31', dueDate: '2026-11-11', today: '2026-11-04' }), 'week_left');
  });
  test('other days stay quiet', () => {
    assert.equal(nudgeReason({ periodEnd: '2026-10-31', dueDate: '2026-11-11', today: '2026-11-05' }), null);
    assert.equal(nudgeReason({ periodEnd: '2026-10-31', dueDate: '2026-11-11', today: '2026-10-31' }), null);
  });
  test('no due date means only the opening nudge', () => {
    assert.equal(nudgeReason({ periodEnd: '2026-10-31', dueDate: null, today: '2026-11-01' }), 'opened');
    assert.equal(nudgeReason({ periodEnd: '2026-10-31', dueDate: null, today: '2026-11-04' }), null);
  });
  test('year and month boundaries', () => {
    assert.equal(nudgeReason({ periodEnd: '2026-12-31', dueDate: '2027-01-11', today: '2027-01-01' }), 'opened');
    assert.equal(nudgeReason({ periodEnd: '2026-12-31', dueDate: '2027-01-11', today: '2027-01-04' }), 'week_left');
  });
});

describe('splitByWorkload', () => {
  test('gives each client to the least loaded person, one at a time', () => {
    const r = splitByWorkload(['c1', 'c2', 'c3', 'c4'], [{ id: 'a', load: 2 }, { id: 'b', load: 0 }]);
    assert.deepEqual(r, { c1: 'b', c2: 'b', c3: 'a', c4: 'b' });
  });
  test('ties go to the first person in the list', () => {
    const r = splitByWorkload(['c1', 'c2'], [{ id: 'a', load: 0 }, { id: 'b', load: 0 }]);
    assert.deepEqual(r, { c1: 'a', c2: 'b' });
  });
  test('no team means no assignments', () => {
    assert.deepEqual(splitByWorkload(['c1'], []), {});
  });
});

describe('canGrantCapability', () => {
  test('only a super admin may grant the deadline task capability', () => {
    assert.ok(SUPER_ADMIN_ONLY_CAPABILITIES.includes('compliance.generate_tasks'));
    assert.equal(canGrantCapability({ is_prime_admin: true }, 'compliance.generate_tasks'), true);
    assert.equal(canGrantCapability({ is_prime_admin: false }, 'compliance.generate_tasks'), false);
    assert.equal(canGrantCapability({}, 'compliance.generate_tasks'), false);
  });
  test('other capabilities are unaffected', () => {
    assert.equal(canGrantCapability({ is_prime_admin: false }, 'tasks.create'), true);
  });
});

import { restrictedCapabilityChanges } from '../lib/auth/capability-grant';

describe('restrictedCapabilityChanges', () => {
  test('reports a restricted capability that is added or removed', () => {
    assert.deepEqual(restrictedCapabilityChanges(['tasks.view'], ['tasks.view', 'compliance.generate_tasks']), ['compliance.generate_tasks']);
    assert.deepEqual(restrictedCapabilityChanges(['compliance.generate_tasks'], []), ['compliance.generate_tasks']);
  });
  test('ignores restricted capabilities that stay as they are, and other changes', () => {
    assert.deepEqual(restrictedCapabilityChanges(['compliance.generate_tasks'], ['compliance.generate_tasks', 'tasks.view']), []);
    assert.deepEqual(restrictedCapabilityChanges([], ['tasks.view']), []);
  });
});
