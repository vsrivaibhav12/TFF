import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { canTransition, nextStatuses } from '../lib/services/task-transitions';

describe('Task Transitions', () => {
  test('pending can move to in_progress and cancelled', () => {
    assert.ok(canTransition('pending', 'in_progress'));
    assert.ok(canTransition('pending', 'cancelled'));
    assert.ok(!canTransition('pending', 'completed'));
  });

  test('in_progress can move to completed, cancelled, or back to pending', () => {
    assert.ok(canTransition('in_progress', 'completed'));
    assert.ok(canTransition('in_progress', 'cancelled'));
    assert.ok(canTransition('in_progress', 'pending'));
  });

  test('completed can be reopened to in_progress', () => {
    assert.deepEqual(nextStatuses('completed'), ['in_progress']);
    assert.ok(!canTransition('completed', 'pending'));
    assert.ok(canTransition('completed', 'in_progress'));
  });

  test('cancelled can be reopened to pending', () => {
    assert.ok(canTransition('cancelled', 'pending'));
    assert.ok(!canTransition('cancelled', 'in_progress'));
    assert.ok(!canTransition('cancelled', 'completed'));
  });

  test('nextStatuses returns correct arrays', () => {
    assert.deepEqual(nextStatuses('pending'), ['in_progress', 'cancelled']);
    assert.deepEqual(nextStatuses('in_progress'), ['completed', 'cancelled', 'pending']);
    assert.deepEqual(nextStatuses('completed'), ['in_progress']);
    assert.deepEqual(nextStatuses('cancelled'), ['pending']);
  });
});
