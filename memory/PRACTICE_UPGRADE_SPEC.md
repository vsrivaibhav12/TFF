# Practice upgrade spec (November 2026)

Status: draft for review. Nothing in this document is built yet.
Scope: editing, uniform periods, compliance-driven task creation, tasks dashboard, role-based home dashboards, and housekeeping.

## 1. Decisions already made

| Topic | Decision |
|---|---|
| Phases | Five phases below, built in order. Each ships on its own. |
| Market-research ideas (capacity board, client document requests, bulk email, expenses, AI summaries) | Not wanted. Out of scope. |
| Editing completed tasks | Admins only, with an audit entry. |
| Yearly periods | Financial year everywhere ("FY 2025-26"), including income tax. |
| Housekeeping | Included: merge the admin and team task tables, refresh `AGENTS.md`, add tests. |
| Monthly cron | Replaced by a nudge. It no longer creates unassigned tasks. |
| Delegation | A super admin chooses who may create tasks from deadlines (section 5.5). |
| Missing default assignee | The create step leaves the row blank. There is no fallback to a relationship owner. |
| Mockups | Approved: admin home, team home, tasks page, create-tasks-for-a-deadline screen. |

## 2. Findings that shape the design

- The "UI polish" commit (499f554) made task-panel pencil icons hover-only. The edit code still exists in [full-layout.tsx](../components/tasks/detail/full-layout.tsx) and [modal-layout.tsx](../components/tasks/detail/modal-layout.tsx).
- [task-modify-guard.ts](../lib/services/task-modify-guard.ts) blocks every edit on a completed task.
- Period is three free number inputs ([new-task-dialog.tsx:269](../components/tasks/new-task-dialog.tsx)) and is shown in at least four formats.
- Quarter is a calendar quarter in the cron (`getQuarter(month)`, Jan-Mar = Q1) but the compliance engine uses fiscal quarters. They disagree.
- `uniq_active_task_per_period` only protects tasks that have a month. Quarterly and yearly tasks have no database-level duplicate protection.
- Three code paths decide what is due: the rule engine, the sub-service engine (`refreshServiceDrivenComplianceEvents`) and the cron ([generate-monthly-tasks](../app/api/cron/generate-monthly-tasks/route.ts)). The cron ignores the calendar.
- The cron stamps the current calendar month as the period. GSTR-1 for October is filed in November, so period and due date drift apart.
- Compliance rules are not linked to a sub-service, so a rule-driven event cannot become a task.
- [admin/compliance/page.tsx](../app/admin/compliance/page.tsx) reads events with `.limit(1000)`. Counts become wrong once clients times periods passes 1,000 (breaks the rule in `AGENTS.md`).
- `bulkCreateTasksAction` uses one due date and one assignee, does not check for existing tasks, swallows per-client errors and makes two queries per client.
- `user_has_capability(cap)` already exists as a SQL function, so RLS policies can gate on capabilities.

## 3. Phase 1: visible, complete editing

### 3.1 Task panel
- Replace hover-only pencils with one always-visible **Edit** button in the panel header. It switches the whole panel into edit mode. Fields: title, sub-service, template, period, due date, priority, assignee, reviewer, billing, ARN, description, labels, custom fields.
- Keep inline quick-edit for priority, assignee and due date in the list.
- One Save and one Cancel for the whole panel. A single `updateTaskAction` call carries all changed fields.

### 3.2 Completed tasks
- `canModifyTask(task, { isAdmin })`: completed tasks are editable by admins only. Editable fields on a completed task: period, sub-service, template, billing, ARN, description, labels, custom fields. Status, assignee and due date stay locked; reopening is still the way to change them.
- Every edit on a completed task writes to `global_audit_log` with before and after values.
- The Edit button on completed rows renders for admins only.

### 3.3 Everywhere else
- Audit every list and detail screen for a visible edit route: clients, client services (including fee and default assignee), work-done entries, DSC, credentials, services, sub-services, SOP steps, task templates, billing entities, labels, groups, compliance rules.
- Fix each gap. The audit result (a table of screen, current state, fix) is appended to this spec at the start of phase 1.
- Rule for new screens: any record a user can create must be editable from a visible control, gated by the matching capability.

## 4. Phase 2: uniform periods, financial year, housekeeping

### 4.1 Model
- New column `sub_services.period_type`, one of:
  `none`, `monthly`, `quarterly`, `half_yearly`, `yearly`, `gst_frequency`.
  - `none`: no period (GST registration). Period fields hidden everywhere.
  - `gst_frequency`: month or quarter chosen per client from `clients.gst_filing_frequency` (monthly or QRMP). Used for GSTR-3B and similar.
- New columns on `tasks`: `period_type` (copied from the sub-service at creation) and `period_key`, a canonical text key:

| Type | Key example | Meaning |
|---|---|---|
| monthly | `2026-10` | October 2026 |
| quarterly | `FY2026-27-Q2` | Jul-Sep 2026 (fiscal quarter) |
| half_yearly | `FY2026-27-H1` | Apr-Sep 2026 |
| yearly | `FY2026-27` | Apr 2026 - Mar 2027 |

- Existing columns `period_year`, `period_month`, `period_quarter` stay and are kept in sync for existing reports and filters. For quarterly, half-yearly and yearly tasks `period_year` is the FY start year.
- New unique index on `(client_id, sub_service_id, period_key)` where `is_deleted = false` and `period_key is not null`. It replaces `uniq_active_task_per_period` after backfill.
- Quarters are fiscal everywhere (Q1 = Apr-Jun). The calendar-quarter logic in the cron goes away with the cron (section 5.7).

### 4.2 Code
- `lib/periods.ts` (pure, no imports from the server): `PeriodType`, `periodKey()`, `parsePeriodKey()`, `formatPeriod()` ("Oct 2026", "Q2 FY 2026-27", "FY 2025-26"), `periodOptions(type, now)`, `fyOf(date)`, `defaultPeriodFor(subService, client, today)`, `dueDateFor(period, subService)`.
- `components/ui/PeriodPicker.tsx`: one control. Monthly shows a month dropdown with year. Quarterly shows quarters with month ranges. Yearly shows financial years. `none` renders nothing. `gst_frequency` resolves to monthly or quarterly from the selected client.
- Used by: new task dialog, task edit form, bulk create, import, filters, exports, deadline create screen.
- `formatPeriod()` replaces every ad hoc period string (task panel, table, hover card, exports, titles via `buildTaskTitle`).

### 4.3 Server rules
- `createTaskAction`, `updateTaskAction`, `bulkCreateTasksAction`, `commitTaskImportAction` call `assertPeriodMatches(subService, client, period)`. A period that does not fit the type is rejected (for example a month on a yearly task, any period on a `none` task).
- Changing a task's sub-service re-validates the period and asks for a new one if the type changed.

### 4.4 Migration
- Add columns and index with a dated file in `db/migrations/`, applied with `npm run db:apply-migration`.
- Backfill `sub_services.period_type` from `frequency` and `is_recurring` (`monthly`, `quarterly`, `annually` becomes `yearly`; non-recurring becomes `none`). The admin reviews the resulting list once in the services screen.
- Backfill `tasks.period_key` where the existing fields allow it.
- Produce a report (admin page, exportable) of tasks whose period does not fit their sub-service, including tasks whose quarter was a calendar quarter. Nothing is rewritten automatically. The admin corrects them with the Phase 1 edit form (bulk fix for repeated cases).

### 4.5 Housekeeping in this phase
- Merge [app/admin/tasks/tasks-table.tsx](../app/admin/tasks/tasks-table.tsx) and [app/team/tasks/tasks-table-client.tsx](../app/team/tasks/tasks-table-client.tsx) into one `TasksTable` component. Role differences are props (`canEdit`, `canComplete`, `canDelete`, `canAssign`, `team`).
- Refresh `AGENTS.md`: role model (admin and team only), test list (remove tests for deleted modules), the new period model, the new capability, the new cron.
- Tests (`__tests__/`): `periods.test.ts` (keys, FY boundaries, quarter ranges, formatting, `gst_frequency` resolution), `period-validation.test.ts`, `task-modify-guard.test.ts` (admin versus team on completed tasks).

## 5. Phase 3: compliance drives task creation

### 5.1 One source of truth
- A **deadline** is: sub-service + period + due date.
- New table `compliance_deadlines`: `id`, `sub_service_id`, `period_key`, `due_date`, `original_due_date`, `extension_note`, `updated_by`, `updated_at`; unique on `(sub_service_id, period_key)`.
- Due date resolution: `compliance_deadlines.due_date` if a row exists, otherwise the computed date from the rule or the sub-service configuration. A row is written when an admin changes a date (extension) or confirms a month's dates.
- New nullable column `compliance_calendar_rules.sub_service_id`. The rules settings page gets a sub-service selector. Rule-driven events inherit it, so they can become tasks. Rules with no sub-service stay calendar-only and show a "link a sub-service" hint.
- `compliance_calendar_events` rows remain the per-client rows under a deadline. `events.task_id` is set when a task is created.
- The rule engine and the sub-service engine are merged behind one `generateEvents()` entry point. Rules with predicates (monthly versus QRMP, TDS deductor, audit applicable) decide which clients apply; sub-service events cover linked clients with no rule.

### 5.2 Default assignee
- New column `client_sub_services.default_assignee_id` (nullable, references the profile).
- Editable in the client's service manager and in bulk on the sub-service clients page.
- No fallback. If it is empty, the create step shows the row blank and requires a choice before creating.

### 5.3 The create flow (matches the approved mockup)
Entry points: the admin home button, the compliance page (per deadline row), the tasks page. Three steps.
1. **Deadline.** Pick sub-service and period (period picker from 4.2). Shows the due date with a Change action (5.4). Shows counts: linked, apply, already have a task.
2. **Assign.** One row per applicable client. Checkbox, default assignee, assign-to select. Rows that already have a task (event has `task_id`, or the unique index would reject) are greyed out and disabled with "Task exists". Bulk actions: use default assignees, assign selected to one person, split by current workload. Filter by client group.
3. **Review and create.** Summary (count, due date, priority). One button. Result screen lists created, skipped and failed clients by name with reasons.

### 5.4 Government extensions
- Change on the deadline writes a `compliance_deadlines` row, updates `due_date` on its events, and asks whether to also move the due date on open tasks for that deadline (default: yes for tasks not yet completed).
- Audit entry with old date, new date and note. Notification to assignees of affected tasks.

### 5.5 Delegation
- New capability `compliance.generate_tasks` ("Create tasks from deadlines"), category Compliance, persona supervisory, added to `ALL_CAPABILITIES` and `CAPABILITY_DETAILS`.
- Admins hold it implicitly. A super admin delegates it by granting it to specific team members through the existing capability grant screens and role templates. Every grant and revoke is already audited.
- The capability covers only this flow: creating tasks for a deadline and assigning them. It does not grant general `tasks.create` or `tasks.assign`.
- Holders also receive the nudges in 5.7.
- Decided: only super admins (`is_prime_admin`) may grant or revoke `compliance.generate_tasks`. The capability grant action, role templates and bulk grant paths all reject this capability from anyone else, and the capability screens show it as locked for non-prime admins. Add a test for each path.

### 5.6 Server action and security
- `createTasksForDeadlineAction({ sub_service_id, period_key, due_date, priority, rows: [{ client_id, assigned_to }] })`: `requireRole(['admin','team'])`, then `requireCapability(me, 'compliance.generate_tasks')`, then Zod validation.
- Service layer `deadline-task-service.ts`: validates the period against the sub-service, checks each client is linked and applicable, assignee is an active team member, inserts in chunks of 100, copies SOP steps, sets `events.task_id`, returns `{ created, skipped, failed[] }`. No silent catches.
- Repository functions only run queries. One audit entry per run (`task.deadline_bulk_create`) with counts and the deadline.
- RLS: team members normally see only assigned clients, so a delegate cannot read all linked clients through ordinary policies. Add policies using `user_has_capability('compliance.generate_tasks')`: select on `compliance_calendar_events`, insert on `tasks` for tasks created through this flow, and a minimal read path for the client list (id, business name, group) without exposing sensitive client fields. Verified with new cases in `npm run db:rls-test`. No service-role client in this request path.

### 5.7 Cron replaced by nudges
- Retire `/api/cron/generate-monthly-tasks` and its entry in `vercel.json`.
- Add `/api/cron/deadline-nudges` (daily, same auth pattern: `isAuthorizedCron`, `createServiceClient`, `maxDuration = 60`).
- For each deadline whose period has opened and which still has applicable clients without tasks, notify admins and every holder of `compliance.generate_tasks` once on period open and again when 7 days remain: "GSTR-1 Oct 2026: 84 clients, 0 tasks created. Assign now" with a link into step 1 pre-filled.
- Uses the existing `notify()` service and digest. No tasks are created by the cron.

### 5.8 Fixes in this phase
- Admin compliance page: replace `.limit(1000)` with `fetchAll()` or database-side aggregation. Add a test with more than 1,000 events.
- `bulkCreateTasksAction` is replaced by the deadline flow for compliance work. For ad hoc bulk creation it is rewritten to batch queries, check for existing tasks, take per-client assignees, and report failures.

## 6. Phase 4: tasks page mini-dashboard

- Six tiles: open, overdue, due today, due this week, waiting on client, to verify (admin also: unassigned). Each tile is a link that sets the matching filter in the URL; the active tile is outlined.
- A thin status bar: pending, in progress, completed counts for the current filters.
- Counts come from `countTasks()` with the current filter set. One round of parallel count queries, no row fetch. Replaces the current one-line summary in [tasks-list-page.tsx](../components/tasks/tasks-list-page.tsx).
- Tiles and the table share the filter parser (`parseTaskFilterParams`), so they always agree.

## 7. Phase 5: home dashboards by role

Shared components in `components/dashboard/`: `KpiTile` (value, label, delta versus previous period, optional sparkline), `DeadlineProgress` (filed of total per return, overdue segment), `WorkloadBars` (stacked on track, due this week, overdue; capacity marker), `AgeingBars`, `AttentionList`, `WeekStrip`. Charts use existing Recharts or plain CSS bars. No new dependency.

| Role | Contents |
|---|---|
| Admin | Four KPI tiles (due this week, overdue, waiting on client, done but not billed), statutory deadline progress for the next 14 days, team workload, waiting-on-client ageing, needs-attention list (stuck, long overdue, approvals), primary action "Create tasks for a deadline" |
| Manager (user with direct reports) | Team's overdue and due this week, workload of reports, approvals waiting, tasks awaiting their verification |
| Team member | Today list in priority order with checklist progress, week strip, tasks waiting on client with days waiting, hours logged today, attendance prompt |

- Data: one service function per role (`getAdminHome`, `getManagerHome`, `getMemberHome`) returning a typed object, called from the page; pages stay thin.
- Every query that can exceed 1,000 rows uses `fetchAll()` or database aggregation.
- "Done but not billed" uses completed billable tasks with `billed = false`.
- Layout per the approved mockups. Sentence case, no emojis, status colours only for status.

## 8. Cross-cutting

- Migrations: dated files in `db/migrations/`, one per phase where schema changes (phase 2: period columns and index; phase 3: deadlines table, rule link, default assignee, policies). Each includes RLS before data.
- Capability change: `compliance.generate_tasks` also added to nav gating where the compliance and create-tasks entries appear.
- Audit: completed-task edits, extensions, bulk deadline creation, capability grants.
- Testing: unit tests for pure logic as listed; `db:rls-test` extended; manual check of each mockup screen in the dev server per phase.
- Performance: no row fetches for counts; chunking for any `.in()` list over about 200 ids.

## 9. Risks and open items

- Existing quarterly and yearly tasks may carry calendar-quarter or calendar-year semantics. They are reported, not rewritten. Reports that group by period may look different until corrected.
- Switching the unique index from month-only to `period_key` must be done after backfill, or duplicates in legacy data will block the migration. The migration checks for conflicts first and stops with a list.
- Delegates and RLS (5.6) is the trickiest piece and gets its own tests before the UI is built.

## 10. Build order

1. Phase 1: editing (also lays the audit table for completed-task edits).
2. Phase 2: periods, financial year, housekeeping.
3. Phase 3: compliance-driven creation, delegation, nudges.
4. Phase 4: tasks mini-dashboard.
5. Phase 5: home dashboards.

Each phase gets its own implementation plan and is verified in the browser before the next starts.

## Appendix A: phase 1 edit-coverage audit (code review, November 2026)

Found by reading each screen's code for a visible control that opens an edit form. Browser confirmation is recorded in the phase 1 plan's verification task.

| Screen | Edit control | Result |
|---|---|---|
| Task panel | One Edit button; per-field hover pencils removed | Fixed |
| Task list rows | Edit button under the task name | Fixed |
| Client profile | Edit button opens the form | Already present |
| Client groups | Pencil per group | Already present |
| Work-done entries | Pencil per entry | Already present |
| DSC records | "Edit" text button per row | Already present |
| Credentials | "Edit" text button per row | Already present |
| Services, sub-services | Dialogs opened from the service card | Already present |
| Service categories | Pencil per category | Already present |
| Task templates and their steps | "Edit" and pencil per item | Already present |
| Billing entities | Pencil per entity | Already present |
| Team member profile | Edit in the team panel | Already present |
| Labels | Create and archive only | Fixed: Edit button renames and recolours (`updateLabelAction`) |
| Profit and cost centres | Add and deactivate only | Fixed: Edit button, code locked while editing |
| Compliance rules | On and off switch only; the save action had no screen | Fixed: Edit dialog for name, description, due day, month offset and reminders; calendar refreshes after saving |

Not changed, with reasons:
- **Client service fee.** The fee field exists in the database but no screen shows it anywhere, so there is nothing to edit yet. It joins the default-assignee field in phase 3.
- **Sub-service SOP steps.** The SOP step actions have no screen at all; checklists are managed through task templates. Raised for review: either add a screen or retire the unused actions.
- **Compliance rule predicates** (`applies_when`) and periodicity are shown but not editable from the dialog, to avoid breaking the rule engine.
- **Full-page task layout.** Removed. It was unreachable because the task panel is only shown in the detail dock.
