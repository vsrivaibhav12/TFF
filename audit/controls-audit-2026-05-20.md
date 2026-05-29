# Controls Audit — Task Engine & Related Workflows

> Date: 2026-05-20  
> Scope: Task lifecycle, step management, billing/ARN, attendance, client access  
> Status: ✅ Hardened with fixes applied today

---

## 1. Task Lifecycle Controls

| Control | Implementation | Status |
|---|---|---|
| **Create** | `requireRole(['admin','team'])` + `requireCapability(me, 'tasks.create')` | ✅ |
| **Transition** | `requireRole(['admin','team','client'])` + `requireCapability(me, 'tasks.complete')` (team/admin only) | ✅ |
| **Transition state machine** | `canTransition(from, to)` enforces valid paths | ✅ |
| **Complete gate — billing** | `canCompleteTask()` blocks if billable and missing ref/amount | ✅ |
| **Complete gate — steps** | `transitionTaskStatus()` blocks if required steps incomplete | ✅ |
| **Modify completed task** | `canModifyTask(task)` returns false for completed/cancelled/deleted | ✅ |
| **Reopen completed task** | `canModifyTask(task, 'in_progress')` allows completed → in_progress | ✅ Fixed |
| **Soft delete** | `softDeleteTaskAction` sets `is_deleted=true`; hard delete blocked by FKs | ✅ |
| **Delete capability** | Requires `tasks.assign` (could be `tasks.delete` — noted below) | ⚠️ See gaps |
| **Inline edit** | `updateTaskAction` blocks completed/deleted; fields: title, desc, priority, due_date, period | ✅ |
| **Verify** | `verifyTaskAction` requires `verify_tasks` capability | ✅ |
| **Stuck flag** | `setTaskStuckAction` requires `tasks.assign`; blocks on completed/cancelled | ✅ |
| **Blocked-on-client** | `setTaskBlockedOnClientAction` requires `tasks.assign` | ✅ |

### Transition Matrix (valid moves)

```
pending     → in_progress, cancelled
in_progress → completed, cancelled, pending
completed   → in_progress  (reopen)
cancelled   → pending      (reopen)
```

---

## 2. Step Management Controls

| Control | Implementation | Status |
|---|---|---|
| **Toggle step** | `requireCapability(me, 'tasks.complete')` + 24h uncomplete guard | ✅ |
| **24h uncomplete guard** | Only same user within 24h or admin can uncomplete | ✅ |
| **Sequential enforcement (UI)** | `TaskStepsPanel` blocks completing step N if N-1 incomplete; blocks unchecking N if N+1 complete | ✅ Added |
| **Sequential enforcement (server)** | `canToggleStep()` exists but is only advisory — UI is primary gate | ⚠️ Could harden server-side |
| **Add ad-hoc step** | `requireCapability(me, 'tasks.complete')` | ✅ |
| **Edit step** | `requireCapability(me, 'tasks.complete')` | ✅ |
| **Delete step** | `requireCapability(me, 'tasks.complete')` | ✅ |
| **Reorder steps** | `requireCapability(me, 'tasks.complete')` | ✅ |
| **Lock on closed task** | `TaskStepsPanel` disables toggles/edits when `status === 'completed' \| 'cancelled'` | ✅ Added |

### 24-Hour Uncomplete Guard Detail

```
IF uncompleting:
  IF admin → allow
  ELSE IF same_user AND within_24h_of_completion → allow
  ELSE → reject with STEP_LOCKED
```

---

## 3. Billing & ARN Controls

| Control | Implementation | Status |
|---|---|---|
| **Billable flag inheritance** | Inherited from `sub_services.is_billable` at task creation | ✅ |
| **ARN at completion** | Collected during status transition to `completed` | ✅ |
| **ARN visibility** | `is_arn_client_visible` toggle; surfaced in Notes tab + Details sidebar | ✅ |
| **Bill ref/amount at completion** | Required before completing billable tasks | ✅ |
| **Billing visibility** | Surfaced in Notes tab + Details sidebar | ✅ |

---

## 4. Attendance Controls

| Control | Implementation | Status |
|---|---|---|
| **Check-in / check-out** | Open to all `team` / `admin` | ✅ |
| **Manual upsert** | `upsertAttendanceAction` requires `admin` role | ✅ |
| **Override** | `overrideAttendanceAction` requires `admin` role | ✅ |
| **Geo enforcement** | Geo-fence validation on check-in (if configured) | ✅ |

---

## 5. Client Access Controls (RLS + Capability)

| Layer | Control | Status |
|---|---|---|
| **Middleware** | Redirects unauthenticated from `/portal`, `/team`, `/admin` | ✅ |
| **Role prefix** | Redirects to home page if URL prefix doesn't match role | ✅ |
| **Portal visibility** | Per-client module toggles; unknown module → `notFound()` | ✅ |
| **RLS — tasks** | Client sees only own tasks; team sees assigned clients + own assignments | ✅ |
| **RLS — task_steps** | Same task visibility rules as parent task | ✅ |
| **RLS — task_activity** | Same task visibility rules | ✅ |
| **RLS — task_notes** | Same task visibility rules | ✅ |
| **RLS — credentials** | AES-256-GCM encrypt; decrypted only in `credentials.manage` actions | ✅ |

---

## 6. Gaps & Recommendations

| # | Gap | Risk | Recommendation |
|---|---|---|---|
| 1 | `softDeleteTaskAction` requires `tasks.assign` instead of `tasks.delete` | Users with assign can delete tasks | Change to `tasks.delete` |
| 2 | Step CRUD uses `tasks.complete` capability | Users who can complete can also delete steps | Consider splitting to `tasks.assign` or `tasks.create` for add/edit/delete |
| 3 | `canToggleStep()` is advisory only | Client could bypass sequence via API | Add server-side sequence check in `toggleTaskStepAction` |
| 4 | `updateTaskAction` allows client role | Clients can edit their own tasks (title, desc, etc.) | Verify this is intentional — may need to restrict clients to notes-only |
| 5 | `reopenTaskAction` requires `tasks.assign` | Users with assign can reopen any completed task | Consider `tasks.complete` or a dedicated `tasks.reopen` capability |
| 6 | No audit log entry for inline edits | `updateTaskAction` does not write to `task_activity` | Add activity entries for field changes |
| 7 | Bulk operations bypass individual gates | `bulkDeleteTasksAction`, `bulkCreateTasksAction` use same capability check for all items | Add per-item validation or audit logging |

---

## 7. Changes Applied Today

1. ✅ **Step sequence enforcement** — UI blocks out-of-order completion in `TaskStepsPanel`
2. ✅ **Step lock on closed tasks** — `TaskStepsPanel` disables edits when task is completed/cancelled
3. ✅ **Reopen fix** — `canModifyTask(task, 'in_progress')` allows reopening completed tasks
4. ✅ **Template step seeding fix** — `createTaskAction` and `loadTemplateStepsAction` use `createServiceClient()` to bypass RLS during seeding
5. ✅ **Inline editing expansion** — Added priority and due date inline editing to `TaskDetailShell`
6. ✅ **Tab defaults** — Default tab is "Steps"; Activity moved to last position
