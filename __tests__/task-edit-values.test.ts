import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { taskToEditValues } from '../lib/services/task-edit-values';
import { diffFields } from '../lib/services/field-diff';

const task = {
  sub_service_id: 'ss-1',
  task_template_id: null,
  period_year: 2026,
  period_month: 10,
  period_quarter: null,
  is_billable: true,
  bill_reference: 'INV-1',
  bill_amount: 5000,
  arn_reference: null,
  is_arn_client_visible: null,
  description: undefined,
  priority: 'medium',
  due_date: '2026-11-11T00:00:00+00:00',
};

describe('taskToEditValues', () => {
  test('normalises missing values and trims the due date to a day', () => {
    const v = taskToEditValues(task);
    assert.equal(v.due_date, '2026-11-11');
    assert.equal(v.description, null);
    assert.equal(v.is_arn_client_visible, false);
    assert.equal(v.task_template_id, null);
    assert.equal(v.bill_amount, 5000);
  });

  test('a form that was not touched produces an empty patch against its own snapshot, even after the server data changed', () => {
    const snapshot = taskToEditValues(task);
    const untouchedDraft = { ...snapshot };
    // Someone else changed the priority on the server after the form opened.
    const serverNow = taskToEditValues({ ...task, priority: 'urgent' });
    assert.notEqual(serverNow.priority, snapshot.priority);
    assert.deepEqual(diffFields(snapshot, untouchedDraft, Object.keys(snapshot)), {});
  });
});
