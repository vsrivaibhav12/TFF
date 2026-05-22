import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, nextStatuses } from '../lib/services/task-transitions';
import type { TaskStatus } from '../lib/validation/schemas';

describe('task-transitions', () => {
  test('pending → in_progress', () => {
    assert.equal(canTransition('pending', 'in_progress'), true);
  });
  test('pending → cancelled', () => {
    assert.equal(canTransition('pending', 'cancelled'), true);
  });
  test('pending → completed is blocked', () => {
    assert.equal(canTransition('pending', 'completed'), false);
  });
  test('in_progress → completed', () => {
    assert.equal(canTransition('in_progress', 'completed'), true);
  });
  test('in_progress → cancelled', () => {
    assert.equal(canTransition('in_progress', 'cancelled'), true);
  });
  test('in_progress → pending (rollback)', () => {
    assert.equal(canTransition('in_progress', 'pending'), true);
  });
  test('completed can be reopened to in_progress', () => {
    assert.equal(canTransition('completed', 'pending' as TaskStatus), false);
    assert.equal(canTransition('completed', 'in_progress' as TaskStatus), true);
    assert.equal(canTransition('completed', 'cancelled' as TaskStatus), false);
  });
  test('cancelled → pending (reopen)', () => {
    assert.equal(canTransition('cancelled', 'pending'), true);
  });
  test('cancelled → in_progress is blocked', () => {
    assert.equal(canTransition('cancelled', 'in_progress'), false);
  });
  test('nextStatuses returns correct arrays', () => {
    assert.deepEqual(nextStatuses('pending'), ['in_progress', 'cancelled']);
    assert.deepEqual(nextStatuses('in_progress'), ['completed', 'cancelled', 'pending']);
    assert.deepEqual(nextStatuses('completed'), ['in_progress']);
    assert.deepEqual(nextStatuses('cancelled'), ['pending']);
  });
  test('invalid status returns false', () => {
    assert.equal(canTransition('invalid' as TaskStatus, 'pending'), false);
    assert.deepEqual(nextStatuses('invalid' as TaskStatus), []);
  });
});
