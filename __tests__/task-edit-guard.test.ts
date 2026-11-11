import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  canEditTaskFields,
  taskEditMode,
  CLOSED_TASK_EDITABLE_FIELDS,
} from '../lib/services/task-modify-guard';

const admin = { isAdmin: true };
const member = { isAdmin: false };

describe('canEditTaskFields', () => {
  test('deleted task: IMMUTABLE for everyone', () => {
    for (const actor of [admin, member]) {
      const r = canEditTaskFields({ status: 'pending', is_deleted: true }, ['description'], actor);
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.code, 'IMMUTABLE');
    }
  });

  test('pending, in_progress and cancelled: any field is ok for both actors', () => {
    for (const status of ['pending', 'in_progress', 'cancelled']) {
      for (const actor of [admin, member]) {
        assert.deepEqual(canEditTaskFields({ status }, ['priority', 'due_date', 'description'], actor), { ok: true });
      }
    }
  });

  test('completed + non-admin: FORBIDDEN with admin-only reason', () => {
    const r = canEditTaskFields({ status: 'completed' }, ['description'], member);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.code, 'FORBIDDEN');
      assert.equal(r.reason, 'Only admins can edit completed tasks');
    }
  });

  test('completed + admin + allowed fields: ok', () => {
    assert.deepEqual(canEditTaskFields({ status: 'completed' }, ['description', 'period_month'], admin), { ok: true });
  });

  test('completed + admin + priority: IMMUTABLE and names the field', () => {
    const r = canEditTaskFields({ status: 'completed' }, ['priority'], admin);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.code, 'IMMUTABLE');
      assert.match(r.reason, /priority/);
    }
  });

  test('completed + admin + mixed fields: IMMUTABLE and names only the locked one', () => {
    const r = canEditTaskFields({ status: 'completed' }, ['description', 'due_date'], admin);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.match(r.reason, /due_date/);
      assert.doesNotMatch(r.reason, /description/);
    }
  });

  test('labels and custom_fields are editable on completed tasks by admins', () => {
    assert.ok(CLOSED_TASK_EDITABLE_FIELDS.includes('labels'));
    assert.ok(CLOSED_TASK_EDITABLE_FIELDS.includes('custom_fields'));
    assert.deepEqual(canEditTaskFields({ status: 'completed' }, ['labels'], admin), { ok: true });
    assert.deepEqual(canEditTaskFields({ status: 'completed' }, ['custom_fields'], admin), { ok: true });
  });
});

describe('taskEditMode', () => {
  test('open task: full with canEdit, none without', () => {
    assert.equal(taskEditMode({ status: 'pending' }, { canEdit: true, isAdmin: false }), 'full');
    assert.equal(taskEditMode({ status: 'in_progress' }, { canEdit: false, isAdmin: true }), 'none');
  });

  test('completed: limited for admin with canEdit, none for non-admin', () => {
    assert.equal(taskEditMode({ status: 'completed' }, { canEdit: true, isAdmin: true }), 'limited');
    assert.equal(taskEditMode({ status: 'completed' }, { canEdit: true, isAdmin: false }), 'none');
  });

  test('deleted: none', () => {
    assert.equal(taskEditMode({ status: 'pending', is_deleted: true }, { canEdit: true, isAdmin: true }), 'none');
  });

  test('cancelled with canEdit: full', () => {
    assert.equal(taskEditMode({ status: 'cancelled' }, { canEdit: true, isAdmin: false }), 'full');
  });
});
