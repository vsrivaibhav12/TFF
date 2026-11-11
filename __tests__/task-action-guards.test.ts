import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Return the source of one exported function, up to the next top-level export. */
function functionSource(file: string, name: string): string {
  const text = readFileSync(join(process.cwd(), file), 'utf-8');
  const start = text.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} not found in ${file}`);
  const next = text.indexOf('\nexport ', start + 1);
  return text.slice(start, next === -1 ? undefined : next);
}

// Every server action that changes a task's editable data must apply the completed-task rule
// (admins only, allowed fields only), so a team member cannot bypass the screen by calling it directly.
const GUARDED: Array<[string, string]> = [
  ['lib/actions/tasks.ts', 'updateTaskAction'],
  ['lib/actions/tasks.ts', 'updateTaskLabelsAction'],
  ['lib/actions/tasks.ts', 'updateTaskCustomFieldsAction'],
  ['lib/actions/tasks.ts', 'updateTaskBillingAction'],
  ['lib/actions/tasks.ts', 'updateTaskArnAction'],
  ['lib/actions/task-custom-fields.ts', 'toggleTaskLabelAction'],
  ['lib/actions/task-custom-fields.ts', 'upsertCustomFieldValueAction'],
];

// Edits to a completed task must leave an audit entry.
const AUDITED_WHEN_COMPLETED: Array<[string, string]> = [
  ['lib/actions/tasks.ts', 'updateTaskBillingAction'],
  ['lib/actions/tasks.ts', 'updateTaskArnAction'],
  ['lib/actions/task-custom-fields.ts', 'toggleTaskLabelAction'],
  ['lib/actions/task-custom-fields.ts', 'upsertCustomFieldValueAction'],
];

describe('task action guards', () => {
  for (const [file, name] of GUARDED) {
    it(`${name} applies canEditTaskFields`, () => {
      assert.match(functionSource(file, name), /canEditTaskFields\(/);
    });
  }
  for (const [file, name] of AUDITED_WHEN_COMPLETED) {
    it(`${name} audits edits to completed tasks`, () => {
      assert.match(functionSource(file, name), /auditClosedTaskEdit\(/);
    });
  }
});
