import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseTaskSequence, formatTaskNumber, classifyTaskInsertError, friendlyTaskWriteMessage } from '../lib/services/task-number';

describe('task numbers', () => {
  test('parse the sequence, whatever its length', () => {
    assert.equal(parseTaskSequence('T-26-0042'), 42);
    assert.equal(parseTaskSequence('T-26-9999'), 9999);
    assert.equal(parseTaskSequence('T-26-10000'), 10000);
    assert.equal(parseTaskSequence(null), 0);
    assert.equal(parseTaskSequence('nonsense'), 0);
  });
  test('format pads to four digits but never cuts a longer number', () => {
    assert.equal(formatTaskNumber('T-26-', 7), 'T-26-0007');
    assert.equal(formatTaskNumber('T-26-', 9999), 'T-26-9999');
    assert.equal(formatTaskNumber('T-26-', 10000), 'T-26-10000');
    assert.equal(formatTaskNumber('T-26-', 123456), 'T-26-123456');
  });
});

describe('classifyTaskInsertError', () => {
  test('a clash on the task number is retried', () => {
    assert.equal(classifyTaskInsertError({ code: '23505', message: 'duplicate key value violates unique constraint "idx_tasks_task_number_active"' }), 'retry_number');
    assert.equal(classifyTaskInsertError({ code: '23505', message: 'duplicate key value violates unique constraint "tasks_task_number_key"' }), 'retry_number');
  });
  test('a clash on client, service and period is a duplicate, not a numbering problem', () => {
    assert.equal(classifyTaskInsertError({ code: '23505', message: 'duplicate key value violates unique constraint "uniq_active_task_period_key"' }), 'duplicate_period');
    assert.equal(classifyTaskInsertError({ code: '23505', message: 'duplicate key value violates unique constraint "uniq_active_task_per_period"' }), 'duplicate_period');
  });
  test('anything else is not retried', () => {
    assert.equal(classifyTaskInsertError({ code: '23514', message: 'violates check constraint "tasks_due_date_check"' }), 'other');
    assert.equal(classifyTaskInsertError({ message: 'boom' }), 'other');
  });
});

describe('friendlyTaskWriteMessage', () => {
  test('explains a duplicate period in plain words', () => {
    assert.equal(
      friendlyTaskWriteMessage('duplicate key value violates unique constraint "uniq_active_task_period_key"'),
      'This client already has a task for this service and period',
    );
  });
  test('explains a due date before the creation date', () => {
    assert.match(friendlyTaskWriteMessage('new row for relation "tasks" violates check constraint "tasks_due_date_check"'), /due date/i);
  });
  test('leaves other messages alone', () => {
    assert.equal(friendlyTaskWriteMessage('something else'), 'something else');
  });
});
