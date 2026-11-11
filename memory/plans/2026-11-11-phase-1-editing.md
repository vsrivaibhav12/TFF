# Phase 1: visible, complete editing: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every task is editable from one visible Edit button (admins can also correct completed tasks), and every other record type has a visible, capability-gated edit control.

**Architecture:** A pure guard module decides who may edit which fields of a task in which state. `updateTaskAction` enforces it on the server and audits edits to completed tasks. The task panel (modal and full layouts) swaps its per-field hover pencils for one `TaskEditForm` that saves all changed fields in one call. A final task audits and fixes the other screens.

**Tech Stack:** Next.js 14 App Router, TypeScript, Server Actions, Zod, shadcn/ui, Sonner, Node test runner (`node:test` with `tsx`).

**Spec:** [memory/PRACTICE_UPGRADE_SPEC.md](../PRACTICE_UPGRADE_SPEC.md) section 3 (Phase 1).

## Global Constraints

- Three layers: actions gate and validate, services hold logic, repositories only query. Actions return `ok()` or `fail(message, code)`.
- Every action calls `requireRole(['admin','team'])` then `requireCapability(...)`. Role comes from `getCurrentUser()` / `requireRole`, never `user_metadata`.
- UI copy: sentence case, no emojis, no exclamation marks (toasts excepted, sparingly), active voice. Controls use shadcn/ui.
- No edit control may be visible only on hover. Keyboard focus and touch must always reach it.
- Completed tasks: editable by admins only. Editable fields: `title`, `description`, `period_year`, `period_month`, `period_quarter`, `sub_service_id`, `task_template_id`, `is_billable`, `bill_reference`, `bill_amount`, `arn_reference`, `is_arn_client_visible`, `labels`, `custom_fields`. Locked: `priority`, `due_date`, assignees, reviewers, status.
- Every edit of a completed task writes a `global_audit_log` entry with before and after values.
- Do not commit unless the user asks. Each task ends with a checkpoint: run its tests and report; leave changes uncommitted.
- Test command: `npm run test:one __tests__/<file>.test.ts`. Full suite: `npm run test`. Also run `npm run lint` and `npm run build` at the end.

## Review Focus

1. A team member with `tasks.edit` calls `updateTaskAction` on a completed task directly (not through the UI): must fail with code `FORBIDDEN`, no write, no audit entry.
2. An admin sends `priority` or `due_date` for a completed task: must fail with `IMMUTABLE` naming the locked fields, even if other allowed fields are in the same request.
3. A user edits the title and the period in the same save: the typed title wins and is not regenerated.
4. Admin changes a completed task's sub-service: title regenerates, no SOP checklist steps are seeded, one audit entry records the change.
5. Saving the edit form with nothing changed sends no request and tells the user "No changes to save".

## File Structure

| File | Responsibility |
|---|---|
| `lib/services/task-modify-guard.ts` (modify) | `canEditTaskFields`, `taskEditMode`, `CLOSED_TASK_EDITABLE_FIELDS`; existing `canModifyTask` and `canCompleteTask` stay for other callers |
| `lib/services/field-diff.ts` (create) | `diffFields`, pure before-and-after comparison used by the server audit and the form |
| `lib/actions/tasks.ts` (modify) | `updateTaskAction`, `updateTaskLabelsAction`, `updateTaskCustomFieldsAction` use the new guard; audit |
| `lib/actions/dock-data.ts` (modify) | Adds `isAdmin` and `canAssign` to task dock data |
| `components/tasks/detail/types.ts` (modify) | `Props` gains `isAdmin`, `canAssign`, `startInEdit?` |
| `components/tasks/detail/use-task-detail.ts` (modify) | `editMode`, `editing`, `startEdit`, `cancelEdit`; old per-field editing state removed |
| `components/tasks/detail/task-edit-form.tsx` (create) | One form for all editable fields, one Save |
| `components/tasks/detail/modal-layout.tsx`, `full-layout.tsx` (modify) | Edit button in header; form replaces per-field pencils |
| `lib/state/dock-state.tsx`, `components/shell/dock-link.tsx`, `components/shell/universal-detail-dock.tsx` (modify) | `mode: 'edit'` opens the panel already editing |
| `app/admin/tasks/tasks-table.tsx`, `app/team/tasks/tasks-table-client.tsx`, `components/tasks/tasks-list-page.tsx` (modify) | Edit button on each row |
| `__tests__/task-edit-guard.test.ts`, `__tests__/field-diff.test.ts` (create), `__tests__/ui-guards.test.ts` (modify) | Tests |

---

### Task 1: Edit guard and field diff (pure logic)

**Files:**
- Modify: `lib/services/task-modify-guard.ts`
- Create: `lib/services/field-diff.ts`
- Test: `__tests__/task-edit-guard.test.ts`, `__tests__/field-diff.test.ts`

**Interfaces:**
- Produces:
  - `CLOSED_TASK_EDITABLE_FIELDS: readonly string[]` (the 14 fields in Global Constraints)
  - `type EditCheck = { ok: true } | { ok: false; code: 'IMMUTABLE' | 'FORBIDDEN'; reason: string }`
  - `canEditTaskFields(task: { status: string; is_deleted?: boolean | null }, fields: readonly string[], actor: { isAdmin: boolean }): EditCheck`
  - `type TaskEditMode = 'full' | 'limited' | 'none'`
  - `taskEditMode(task: { status: string; is_deleted?: boolean | null }, actor: { canEdit: boolean; isAdmin: boolean }): TaskEditMode`
  - `diffFields(before: Record<string, unknown>, after: Record<string, unknown>, keys: readonly string[]): Record<string, { from: unknown; to: unknown }>`

- [ ] **Step 1: Write failing tests** in `__tests__/task-edit-guard.test.ts` (style of `task-transitions.test.ts`):
  - `deleted task: IMMUTABLE for everyone` (admin and non-admin, any fields).
  - `pending, in_progress, cancelled: any field ok for both actors`.
  - `completed + non-admin: FORBIDDEN, reason "Only admins can edit completed tasks"`.
  - `completed + admin + ['description','period_month']: ok`.
  - `completed + admin + ['priority']: IMMUTABLE, reason contains "priority"`; `['description','due_date']` also IMMUTABLE and the reason names only `due_date`.
  - `taskEditMode`: open task with `canEdit` true gives `'full'`; `canEdit` false gives `'none'`; completed + admin + `canEdit` true gives `'limited'`; completed + non-admin gives `'none'`; deleted gives `'none'`; cancelled + `canEdit` gives `'full'`.
  In `__tests__/field-diff.test.ts`: `returns only changed keys`; `treats null, undefined and empty string as equal`; `treats 5 and "5" as different`; `ignores keys not in the list`.
- [ ] **Step 2: Run both files; expect failures** (`canEditTaskFields is not a function`, module not found).
- [ ] **Step 3: Implement** the signatures above. `diffFields` normalises `undefined` and `''` to `null` before a strict compare.
- [ ] **Step 4: Run both files; expect all pass.**
- [ ] **Checkpoint:** report results; leave uncommitted.

---

### Task 2: Server enforcement and audit

**Files:**
- Modify: `lib/actions/tasks.ts` (`updateTaskAction` ~line 710, `updateTaskLabelsAction` ~205, `updateTaskCustomFieldsAction` ~240)

**Interfaces:**
- Consumes: `canEditTaskFields`, `diffFields` from Task 1; `writeAudit` from `@/lib/services/audit-service`.
- Produces: no new exports. Behaviour: `updateTaskAction` returns `fail(reason, code)` from the guard; admins can edit allowed fields on completed tasks.

- [ ] **Step 1: Write the failing tests** that can run without a database, in `__tests__/task-edit-guard.test.ts`: extend with `labels` and `custom_fields` being allowed for admin on completed tasks (covers the constant). The action paths themselves are verified in Task 7 (browser), because they need Supabase.
- [ ] **Step 2: Run; expect the two new cases to fail** if the constant lacks them.
- [ ] **Step 3: In `updateTaskAction`:** replace the `canModifyTask(task)` line with `canEditTaskFields(task, Object.keys(updates), { isAdmin: me.role === 'admin' })` and return `fail(check.reason, check.code)` on failure. Make `titleNeedsRegen` also require `updates.title === undefined`. Skip the SOP step seeding block when `task.status === 'completed'`. After the write, when `task.status === 'completed'`, call `writeAudit({ action: 'task.update_closed', entity_type: 'task', entity_id: task_id, performed_by: me.id, details: { fields: diffFields(task, { ...task, ...updates }, Object.keys(updates)) } })`.
- [ ] **Step 4: In `updateTaskLabelsAction` and `updateTaskCustomFieldsAction`:** replace `canModifyTask(task)` with `canEditTaskFields(task, ['labels'] | ['custom_fields'], { isAdmin: me.role === 'admin' })`. Leave `assignTaskAction`, step actions and work-done actions on `canModifyTask` (assignment and steps stay locked on completed tasks).
- [ ] **Step 5: Run `npm run test` and `npm run build`;** expect pass.
- [ ] **Checkpoint.**

---

### Task 3: Plumb admin and assign flags and edit state into the panel

**Files:**
- Modify: `lib/actions/dock-data.ts` (task branch, ~line 65), `components/tasks/detail/types.ts`, `components/shell/universal-detail-dock.tsx` (task usage ~line 192), `components/tasks/detail/use-task-detail.ts`

**Interfaces:**
- Consumes: `taskEditMode`, `TaskEditMode` from Task 1.
- Produces:
  - `Props` gains `isAdmin: boolean`, `canAssign: boolean`, `startInEdit?: boolean`.
  - `useTaskDetail` returns `editMode: TaskEditMode`, `editing: boolean`, `startEdit(): void`, `cancelEdit(): void`, plus existing fields. `startEdit` is a no-op when `editMode === 'none'`.

- [ ] **Step 1: Failing check:** `npm run build` after adding the new `Props` fields shows type errors at every `<TaskDetail...>` call site; use those errors as the to-do list.
- [ ] **Step 2: `dock-data.ts`:** include `'tasks.assign'` in `hasCapabilities`, return `isAdmin: me.role === 'admin'` and `canAssign: me.role === 'admin' || taskCaps.has('tasks.assign')`.
- [ ] **Step 3: `universal-detail-dock.tsx`:** pass `isAdmin`, `canAssign` (default `false`) and `startInEdit` to the task layouts.
- [ ] **Step 4: `use-task-detail.ts`:** compute `editMode = taskEditMode(task, { canEdit, isAdmin })`; add `editing` state initialised from `startInEdit`; `cancelEdit` resets the draft fields (reuse the existing reset logic) and sets `editing` false. Keep the old `editingX` states for now; Task 4 removes them.
- [ ] **Step 5: `npm run build`;** expect clean.
- [ ] **Checkpoint.**

---

### Task 4: One Edit button and one edit form

**Files:**
- Create: `components/tasks/detail/task-edit-form.tsx`
- Modify: `components/tasks/detail/modal-layout.tsx`, `components/tasks/detail/full-layout.tsx`, `components/tasks/detail/use-task-detail.ts` (remove old per-field `editingX` state), `__tests__/ui-guards.test.ts`

**Interfaces:**
- Consumes: `TaskDetailCtx` from `use-task-detail.ts`; `diffFields`; `updateTaskAction`; `assignTaskAction(input: { task_id; assigned_to?: string | string[] | null; reviewer_id?: string | string[] | null })`.
- Produces: `export function TaskEditForm({ ctx }: { ctx: TaskDetailCtx }): JSX.Element`.

- [ ] **Step 1: Write the failing guard test** in `__tests__/ui-guards.test.ts`: `no edit control is visible only on hover`: walk `app` and `components`, fail for any line containing both `Pencil` and `opacity-0`. Run it; expect failures listing the modal-layout lines. (If an unrelated file such as `components/ui/expandable-cell.tsx` also fails, make that control permanently visible too.)
- [ ] **Step 2: Implement `TaskEditForm`.** Fields: title, sub-service (select from `ctx.subServices`), template (select filtered to the chosen sub-service, with a "No template" choice using value `__none__`, never an empty value), period (the existing year, month, quarter inputs; Phase 2 swaps in the period picker), due date, priority, assignees and reviewers (existing multi-select used at `modal-layout.tsx:242-250`; shown only when `ctx.canAssign`), billable flag, bill reference, bill amount, ARN reference, ARN visible flag, description. When `ctx.editMode === 'limited'`, hide priority, due date, assignees and reviewers. Buttons: "Save changes" and "Cancel".
- [ ] **Step 3: Save behaviour.** Build the patch with `diffFields(original, draft, fieldKeys)`. If the patch and the assignment are both unchanged, `toast.info('No changes to save')` and stay in edit mode. Otherwise call `ctx.saveField(patchValues)` once; if assignees or reviewers changed (and `canAssign`), call `assignTaskAction` after it. If the first call succeeds and the second fails, show `toast.error` naming the assignment failure and keep the form open. On full success call `cancelEdit()` and refresh.
- [ ] **Step 4: Layouts.** In both layouts add an always-visible `Edit` button (shadcn `Button`, `variant="outline"`, pencil icon plus the word "Edit") in the panel header, rendered when `editMode !== 'none' && !editing`. When `editing`, render `<TaskEditForm ctx={ctx} />` in place of the details grid and billing, ARN, service, template and description blocks. Remove every per-field pencil and its inline-edit markup, then remove the matching `editingX` state and setters from the hook.
- [ ] **Step 5: Run `npm run test:one __tests__/ui-guards.test.ts`;** expect pass. Run `npm run build`; expect clean.
- [ ] **Checkpoint.**

---

### Task 5: Edit button on task list rows

**Files:**
- Modify: `lib/state/dock-state.tsx`, `components/shell/dock-link.tsx` (no change if `item` is passed whole), `components/shell/universal-detail-dock.tsx`, `app/admin/tasks/tasks-table.tsx`, `app/team/tasks/tasks-table-client.tsx`, `components/tasks/tasks-list-page.tsx`

**Interfaces:**
- Consumes: `taskEditMode` (Task 1), `startInEdit` (Task 3).
- Produces: `DockItem` gains `mode?: 'view' | 'edit'`. Both tables accept `isAdmin: boolean`.

- [ ] **Step 1: `DockItem`:** add `mode?: 'view' | 'edit'`. In `universal-detail-dock.tsx` pass `startInEdit={item.mode === 'edit'}`. If pushing an item whose `id` is already open with another mode, replace it, not duplicate it.
- [ ] **Step 2: Row button.** In both tables add an "Edit" outline button (small, always visible) in the last column, rendered when `taskEditMode(row, { canEdit, isAdmin }) !== 'none'`. It calls the dock `push({ type: 'task', id, mode: 'edit' })` and stops row click propagation.
- [ ] **Step 3: `tasks-list-page.tsx`:** pass `isAdmin={me.role === 'admin'}` to both tables (admin table: `true`).
- [ ] **Step 4: `npm run build`;** expect clean.
- [ ] **Checkpoint.**

---

### Task 6: Edit-coverage audit of every other screen

**Files:** per row below; plus `memory/PRACTICE_UPGRADE_SPEC.md` (append Appendix A).

For each screen, open it in the dev server (`preview_start`) as an admin and as a team member holding the matching edit capability, and confirm a visible control opens an edit form that saves. Where it is missing, add it using the screen's existing dialog or action and gate it on the capability listed.

| Screen | Starting points | Capability |
|---|---|---|
| Client profile | `components/clients/client-profile-section.tsx` (Edit exists) | `clients.edit` |
| Client services: fee, head, default assignee later | `app/admin/clients/[id]/service-manager.tsx`, `lib/actions/services.ts` | `services.assign` |
| Client groups | `app/admin/clients/groups/client-groups-client.tsx`, `updateClientGroup` | `clients.edit` |
| Work-done entries | `components/operations/work-done-actions.tsx`, `updateWorkDoneAction` | `workdone.manage` |
| DSC records | `components/dsc/dsc-dialog.tsx`, `upsertDscAction` | `dsc.manage` |
| Credentials | `components/credentials/credential-dialog.tsx`, `upsertCredentialAction` | `credentials.manage` |
| Services, sub-services | `components/services/*-dialog.tsx`, `upsertServiceAction`, `upsertSubServiceAction` | `services.manage` |
| SOP steps, task templates and their steps | `components/services/task-template-*.tsx`, `upsertSopStepAction`, `upsertTaskTemplateAction` | `services.manage` |
| Billing entities, profit and cost centres | `app/admin/settings/billing-entities/billing-entities-admin.tsx`, `lib/actions/billing-org.ts` | `manage_billing_entities` |
| Labels | `app/admin/settings/labels/labels-admin.tsx` | `manage_labels` |
| Compliance rules | `components/shell/pages/settings-compliance-rules-page.tsx`, `upsertComplianceRuleAction` | `manage_compliance_rules` |
| Team member profile | `app/admin/team/[id]/page.tsx`, `updateTeamMemberProfileAction` | `staff.manage` |

- [ ] **Step 1:** Walk the screens above; record in Appendix A of the spec a table of screen, edit control found (yes or no, where), fix applied.
- [ ] **Step 2:** Fix each "no" with the smallest change that follows that screen's pattern (button in the row or header, existing dialog opened with `initial`, existing upsert action). Edit controls must be visible without hover and hidden only when the user lacks the capability.
- [ ] **Step 3:** Run `npm run test` and `npm run build`; expect pass.
- [ ] **Checkpoint.**

---

### Task 7: Verification

- [ ] **Step 1:** `npm run test`, `npm run lint`, `npm run build`; expect all pass with no new warnings.
- [ ] **Step 2: Browser walkthrough** (`preview_start`, then `read_page`, `computer`, screenshots):
  - Admin, open task: click Edit; change sub-service and period; Save; title and values update; panel returns to read-only.
  - Admin, completed task: Edit button shown; form lacks priority, due date, assignees; change period; Save; the audit page shows a `task.update_closed` row with before and after values.
  - Team member with `tasks.edit` and `tasks.assign`: open task shows Edit and the assignee field; completed task shows no Edit button.
  - Team member without `tasks.assign`: form hides assignees.
  - Row Edit button on both task tables opens the panel already in edit mode; narrow window (mobile) shows the button without hover.
  - Save with no changes shows "No changes to save".
- [ ] **Step 3:** Attach screenshots of the admin open-task edit and the admin completed-task edit to the report. Note anything not verified.
- [ ] **Checkpoint:** report to the user; commit only if asked.
