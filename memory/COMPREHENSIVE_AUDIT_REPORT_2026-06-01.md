# Comprehensive Audit Report — The Fiscal Fulcrum Portal

**Date:** 2026-06-01  
**Commit:** `3782cd1` (post Round 3)  
**Auditor:** Kimi Code CLI  
**Scope:** Design, UX, schema, database, pages, routing, components, server actions, services, repositories, API routes, security, auth, tests, dependencies  

---

## Executive Summary

The Fiscal Fulcrum portal is a well-architected Next.js 14 application with a clear three-layer design (Actions → Services → Repositories), robust RLS-based security, and a thoughtful role-capability authorization model. The codebase demonstrates mature engineering decisions: Server Components by default, cookie-based Supabase SSR auth, explicit column selection, soft-delete patterns, and comprehensive audit logging infrastructure.

**However, there is a significant gap between the *documented* architecture and the *implemented* code.** Many actions bypass the Service/Repository layers, form validation is inconsistently applied, the design system has drifted across 77+ files, and several security-critical endpoints lack proper gating. These are not fundamental flaws — they are accumulated technical debt from rapid feature development.

| Category | Grade | Confidence |
|---|---|---|
| Overall Architecture | B+ | High |
| Security & Auth | B | High |
| Database & Schema | B+ | High |
| UI/UX & Design System | C+ | High |
| Code Quality & Consistency | C | High |
| Test Coverage | D | High |
| Performance | B | Medium |

---

## 1. Database & Schema Audit

### 1.1 Schema Completeness

**Total tables: 73** across 6 schema files plus migrations.

| Schema File | Tables | Purpose |
|---|---|---|
| `db/schema.sql` | 46 | Base v3 schema (locked) |
| `db/schema-additions.sql` | 9 | v3.1 additive (capabilities, portal visibility, notifications, saved views, SOP steps, etc.) |
| `db/schema-v3-3.sql` | 17 | Cost centres, billing entities, compliance calendar, custom fields, task workdone |
| `db/schema-bizlens.sql` | 1 | BizLens data table |
| `db/schema-hr-tables.sql` | 2 | Leave balances, holidays |
| `db/schema-permission-requests.sql` | 1 | Permission requests |

**Finding:** Schema is well-organized with clear separation between base and additive schemas. Migration history (23 files) is additive and safe.

### 1.2 RLS Coverage — CRITICAL FINDING

**73 tables** in schema. **72 have `ENABLE ROW LEVEL SECURITY`.**

| Table Missing RLS | Risk |
|---|---|
| `inward_outward_register` | Low — table is created in `schema.sql` but explicitly `DROP`ped in `schema-v3-3.sql` |

**🔴 CRITICAL: `global_audit_log` INSERT is broken**
- `db/rls-2026-05-14-close-gaps.sql` only has a `SELECT` policy for admins on `global_audit_log`
- `lib/services/audit-service.ts:16` uses `createClient()` (regular server client) by default to insert audit rows
- **No authenticated INSERT policy exists**, so all audit logging fails silently unless `serviceRole: true` is passed
- Grepping all `writeAudit()` calls in `lib/actions/` shows **zero calls pass `serviceRole: true`**
- **Fix:** Either add `CREATE POLICY audit_insert_own ON global_audit_log FOR INSERT TO authenticated WITH CHECK (performed_by = auth.uid())`, or change `writeAudit()` to default to `createServiceClient()`

**Tables with RLS enabled but NO explicit policies found:**
| Table | Location |
|---|---|
| `benchmarks` | RLS enabled in schema, no policies |
| `client_feature_flags` | RLS enabled, no policies |
| `engagement_letters` | RLS enabled, no policies |
| `payroll_adjustments` | RLS enabled, no policies |
| `vendor_gst_filings` | RLS enabled, no policies |

### 1.3 Schema Drift — HIGH SEVERITY

**Base `schema.sql` is "locked" but heavily drifted by migrations:**

| Column | Base schema says | Migration override | File |
|---|---|---|---|
| `tasks.sub_service_id` | `NOT NULL` | `DROP NOT NULL` | `2026-05-13-fix-all-missing-columns.sql` |
| `services.category_id` | `NOT NULL` | `DROP NOT NULL` | `2026-05-20-service-category-optional.sql` |
| `compliance_calendar_events.rule_id` | `NOT NULL` | `DROP NOT NULL` | `2026-05-20-compliance-events-service-driven.sql` |
| `tasks.estimated_hours` | N/A | `DECIMAL(6,2)` vs `NUMERIC(8,2)` | `fix-all-missing-columns.sql` vs `schema-v3-3.sql` |

**`inward_outward_register`** is created in `schema.sql` lines 786–813 but explicitly `DROP TABLE` in `schema-v3-3.sql` line 482.

**`tasks.status` enum drift:**
- Base: `CHECK (status IN ('pending', 'awaiting_client', 'in_progress', 'review', 'completed'))`
- `schema-v3-3.sql` drops this and adds: `CHECK (status IN ('pending','in_progress','completed','cancelled'))`
- Migration correctly converts legacy rows, but base schema is stale

**🔴 `all_work_items` view data leak:**
- `db/schema-all-work-items.sql:103` filters queries with `WHERE q.status != 'closed'`
- Migration `2026-05-31-add-soft-delete-to-missing-tables.sql` adds `is_deleted` to `queries`
- **The view does NOT filter `q.is_deleted = FALSE`** — soft-deleted queries still appear in the Work Hub

**`permission_requests` FK inconsistency:**
- `schema-permission-requests.sql:4,10`: `user_id UUID REFERENCES auth.users(id)`
- Every other user reference in the schema points to `users_profile(id)`
- Breaks the project's identity abstraction

### 1.3 Schema Drift

**Migration-created tables not in schema files:**
- `bizlens_period_snapshots` (migration `2026-05-14-bizlens-period-snapshots.sql`)
- `gst_monthly_data` (migration `2026-05-13-phase-2-task-enhancements.sql`)
- `income_tax_slabs` (migration `2026-05-14-income-tax-slabs.sql`)
- `task_template_steps` (migration `2026-05-21-fix-step-order-unique-constraints.sql`)
- `weekly_timesheet_submissions` (migration `2026-05-20-weekly-ts-admin-rls.sql`)
- `work_done` (legacy migration)

**Recommendation:** These tables should be consolidated into the appropriate schema file so that `schema.sql` + `schema-additions.sql` + `schema-v3-3.sql` represent the complete database definition.

### 1.4 Soft-Delete Consistency

**Tables WITH full soft-delete trio (`is_deleted` + `deleted_at` + `deleted_by`):**
`users_profile`, `clients`, `tasks`, `documents`, `gst_filings`, `tds_filings`, `it_filings`, `hearings`, `queries` (added via migration).

**Tables WITH partial soft-delete (`is_deleted` only):**
`client_groups`, `service_categories`, `services`, `sub_services`, `client_users`, `credentials`, `dsc_records`, `notices`, `query_messages`, `task_notes`, `task_templates`, `sub_service_sop_steps`, `staff_role_templates`, `compliance_status`.

**Tables WITHOUT soft-delete at all:**
`bizlens_data`, `bizlens_period_snapshots`, `gst_monthly_data`, `work_done`, `task_steps`, `task_workdone`, `vcfo_snapshots`, `solution_log`, `compliance_insights`, `attendance_logs`, `payroll_runs`, `payroll_adjustments`, `staff_payroll_settings`, `leave_requests`, `weekly_timesheet_submissions`, `permission_requests`, `leave_balances`, `holidays`, `document_requests`, `task_custom_field_definitions`, `task_custom_field_values`, `task_labels`, `task_label_assignments`, `client_compliance_profiles`, `compliance_calendar_rules`, `compliance_calendar_events`, `engagement_letters`, `firm_profile`, `benchmarks`, `income_tax_slabs`, `financial_data`, `gst_data_entries`.

**High-risk:** Financial tables (`bizlens_data`, `bizlens_period_snapshots`, `gst_monthly_data`, `vcfo_snapshots`) have **no soft delete**. Accidental deletion is permanent.

**Note:** `task_steps` is intentionally hard-deleted (no `is_deleted`). The application performs `.delete()` on this table. This contradicts `AGENTS.md` convention but is acceptable for ephemeral per-task copies.

### 1.5 Index Coverage

**Adequate overall, but several gaps:**

**Missing indexes on foreign keys:**
| Table | Column | Why it matters |
|---|---|---|
| `tasks` | `task_template_id` | Frequently filtered in task-template mutations |
| `tasks` | `verified_by_user_id` | FK to `users_profile`, no index |
| `hearings` | `notice_id` | FK to `notices`, used in joins |
| `users_profile` | `reports_to` | Used heavily in attendance RLS for manager lookups |
| `users_profile` | `manager_id` | Added in portal-gating migration, no index |
| `users_profile` | `active_role_template_id` | Added in schema-additions, no index |
| `document_requests` | `fulfilled_by_document_id` | FK to `documents` |
| `document_requests` | `fulfilled_by_user_id` | FK to `users_profile` |
| `vendor_gst_filings` | `client_id` | FK to `clients`, queried in vendor context |

**Missing partial unique constraint:**
- `users_profile.is_prime_admin` has **no partial unique index**. The application assumes exactly one prime admin, but the database allows multiple. Recommend: `CREATE UNIQUE INDEX idx_users_profile_one_prime ON users_profile(is_prime_admin) WHERE is_prime_admin = TRUE;`

**Good coverage:** Most core FKs (`tasks.client_id`, `tasks.assigned_to`, `gst_filings.client_id`, etc.) are indexed. Partial unique indexes for soft-delete uniqueness are correctly implemented.

### 1.6 Foreign Key Integrity

**No orphaned references detected.** All FK relationships in schema are consistent. The `users_profile` table is the central identity table (not `team_profiles` — this was fixed in Round 1).

**Missing `ON DELETE` actions:** Many FKs lack `ON DELETE CASCADE` or `SET NULL`. While soft-delete reduces impact, hard deletes will cascade-fail:
| Table | Column | Referenced |
|---|---|---|
| `tasks` | `client_id` | `clients(id)` |
| `tasks` | `sub_service_id` | `sub_services(id)` |
| `tasks` | `task_template_id` | `task_templates(id)` |
| `hearings` | `notice_id` | `notices(id)` |
| `queries` | `task_id` | `tasks(id)` |
| `team_client_assignment` | `team_user_id` | `users_profile(id)` |
| `team_client_assignment` | `client_id` | `clients(id)` |
| `client_services` | `service_id` | `services(id)` |
| `client_sub_services` | `sub_service_id` | `sub_services(id)` |

### 1.7 Missing Constraints

**CHECK constraints missing:**
| Table | Column | Suggested check |
|---|---|---|
| `compliance_status` | `status` | Specific enum values |
| `compliance_status` | `filing_type` | Specific enum values |
| `clients` | `gstin` | `LENGTH(gstin) = 15` |
| `clients` | `pan` | `LENGTH(pan) = 10` |
| `staff_payroll_settings` | `monthly_salary` | `> 0` |
| `payroll_runs` | `year` | `> 2000 AND < 2100` |
| `leave_requests` | `from_date`, `to_date` | `to_date >= from_date` |
| `documents` | `file_size` | `>= 0` |
| `dsc_records` | `expiry_date`, `issued_date` | `expiry_date > issued_date` |
| `tasks` | `due_date`, `created_date` | `due_date >= created_date` |

**UNIQUE constraints missing:**
| Table | Missing on | Risk |
|---|---|---|
| `team_client_assignment` | `(team_user_id, client_id, assigned_from)` | Duplicate assignments for same period |
| `engagement_letters` | `(client_id, service_id, document_id)` | Duplicate engagement letters |
| `clients` | `gstin` (partial, active only) | Two active clients sharing a GSTIN |

**Abandoned table:** `client_communication_log` exists in `schema.sql` with RLS policies but is **never referenced in application code** (`lib/` or `app/`).

---

## 2. Pages & Routing Audit

### 2.1 Route Structure

**~82 page routes + 10 API routes.** Clean role-based segmentation with no URL conflicts.

| Section | Routes | Layout | Auth |
|---|---|---|---|
| `/admin/*` | 30+ | `app/admin/layout.tsx` | `requireRole(['admin','team'])` + capability filter |
| `/team/*` | 15+ | `app/team/layout.tsx` | `requireRole(['team','admin'])` + capability filter |
| `/portal/*` | 10+ | `app/portal/layout.tsx` | `requireRole('client')` + portal visibility |
| `/account/*` | 1+ | `app/account/layout.tsx` | `requireRole(['admin','team','client'])` |
| `(marketing)/*` | 9 | `app/(marketing)/layout.tsx` | None |
| `/legal/*` | 5 | None (root layout) | None |

**Parallel routes (`@modal`)** are correctly implemented for slide-out detail views in admin, team, and portal sections. All have matching base routes.

### 2.2 Critical Auth Gaps

| Page | Issue | Severity |
|---|---|---|
| `app/portal/tasks/[id]/page.tsx` | No `requireRole` in leaf page (relies on layout + RLS) | 🔴 High |
| `app/portal/queries/[id]/page.tsx` | No `requireRole` in leaf page | 🔴 High |
| `app/team/clients/[id]/page.tsx` | Uses `getCurrentUser()` instead of `requireRole` | 🟡 Medium |
| `app/team/tasks/page.tsx` | Uses `getCurrentUser()` instead of `requireRole` | 🟡 Medium |
| `app/admin/settings/page.tsx` | No `requireCapability` check | 🟡 Medium |
| `app/admin/reports/*` | No `requireCapability` check | 🟡 Medium |
| `app/admin/team/[id]/*` | No `requireCapability` check | 🟡 Medium |

### 2.3 Route Parameter Validation — MAJOR GAP

**Zero dynamic route parameters are validated with Zod.** Every `[id]/page.tsx`, `[reportId]/page.tsx`, etc. passes `params.id` directly to repositories without UUID validation.

```tsx
// Current (all dynamic routes)
export default async function Page({ params }: { params: { id: string } }) {
  const data = await getSomething(params.id); // no validation
}

// Recommended
const ParamsSchema = z.object({ id: z.string().uuid() });
const { id } = ParamsSchema.parse(params);
```

### 2.4 Missing UI Boundaries

| Missing | Impact |
|---|---|
| `app/not-found.tsx` | Root 404 falls back to Next.js default |
| `app/account/not-found.tsx` | Account 404 unstyled |
| Marketing `error.tsx` | Marketing crashes show raw Next.js error |
| `app/portal/notices/[id]` | Deep-link to notice detail from portal page returns 404 |

### 2.5 force-dynamic Coverage

~75 files correctly use `export const dynamic = 'force-dynamic'`. **3 auth-gated pages missing it:**
- `app/admin/bizlens/[reportId]/input/page.tsx`
- `app/admin/tasks/import/page.tsx`
- `app/admin/settings/page.tsx`

---

## 3. Components & Design System Audit

### 3.1 Design System Drift — CRITICAL

**Grade: C+**

The project uses **both `stone-*` and `zinc-*` Tailwind scales interchangeably** across 77+ component files (859+ occurrences). This violates `memory/DESIGN_SYSTEM.md`.

| Rule | Specified | Actual | Status |
|---|---|---|---|
| Background | white | `#FAFAFA` (zinc-50) | ⚠️ Close enough |
| Headings | zinc-900 | stone-900 in globals.css | ❌ Drift |
| Body text | zinc-500 | stone-500 in globals.css | ❌ Drift |
| Borders | zinc-200 | Mixed stone/zinc | ❌ Drift |
| Card radius | `rounded-xl` | `rounded-[20px]` | ❌ Violation |
| Drop shadows | None on cards | `shadow-card` on Card | ❌ Violation |
| Gradients | None | Avatar gradients everywhere | ❌ Violation |

### 3.2 Every Component is a Client Component — CRITICAL

**Grade: D**

All **90 component files** in `components/` have `'use client'`. This is incorrect for purely presentational primitives:

| Component | Needs `'use client'`? |
|---|---|
| `components/ui/card.tsx` | ❌ No — no hooks, no browser APIs |
| `components/ui/button.tsx` | ❌ No — `cva` + `forwardRef` work in SC |
| `components/ui/input.tsx` | ❌ No — `forwardRef` works in SC |
| `components/ui/skeleton.tsx` | ❌ No |
| `components/ui/badge.tsx` | ❌ No |
| `components/ui/label.tsx` | ❌ No |

**Impact:** Larger client bundles, hydration overhead, loss of SSR benefits for static UI.

### 3.3 Form Patterns — CRITICAL

**Grade: C**

Only **2 files** use React Hook Form + Zod as mandated by AGENTS.md:
- `app/admin/clients/new/client-create-form.tsx` ✅
- `app/team/work-done/work-done-form.tsx` ✅

**All other forms use raw `useState` with manual validation:**
- `new-task-dialog.tsx` — manual `if (!f.client_id) toast.error`
- `bizlens/input-form.tsx` — `handleBlur` auto-save with no validation
- `task-detail-shell.tsx` — inline editing per field, no validation
- `operations/vcfo/vcfo-form.tsx` — raw `useState`

### 3.4 Accessibility

**Grade: B**

**Strengths:**
- Skip-to-content link in app shell
- Mobile drawer has `role="dialog"`, `aria-modal`, `aria-label`
- Command palette keyboard navigation (↑↓, ↵, Esc)

**Weaknesses:**
- Search trigger button has no `aria-label`
- User avatar dropdown has no `aria-expanded`, `aria-controls`
- `score-dial.tsx` SVG has no `role="img"` or title
- Several buttons lack `type="button"` (risk form submission)

### 3.5 Animation / Performance

**Grade: B**

- `globals.css` line 55: `main { animation: pageIn 0.4s ease-out; }` — applies to **every `<main>`**, causing layout shift on every route change
- Framer Motion is appropriately scoped (only 6 files)
- `prefers-reduced-motion` is supported

### 3.6 Monolithic Components

| Component | Lines | Problem |
|---|---|---|
| `app-shell.tsx` | 491 | Sidebar, mobile drawer, desktop top bar, user menu all in one file |
| `task-detail-shell.tsx` | 473 | Header, metadata, description editor, notes, activity timeline |
| `bizlens/input-form.tsx` | 334 | All 4 tab forms in one component |

---

## 4. Server Actions & Business Logic Audit

### 4.1 Three-Layer Architecture

**Grade: C**

AGENTS.md states: *"Actions never touch the database directly."* This is violated extensively.

| File | Violation |
|---|---|
| `lib/actions/tasks.ts` | Direct queries to `sub_services`, `task_activity`, `task_label_assignments`, `task_custom_field_values`, `clients` |
| `lib/actions/credentials.ts` | Direct `insert`/`update` on `credentials` |
| `lib/actions/compliance-calendar.ts` | Direct `upsert` on `client_compliance_profiles`, `compliance_calendar_rules` |
| `lib/actions/notices.ts` | Direct `update`/`insert` on `notices` |
| `lib/actions/hearings.ts` | Direct `insert` on `hearings` |
| `lib/actions/queries.ts` | Direct `insert` on `queries`, `query_messages` |
| `lib/actions/services.ts` | Direct CRUD on `client_sub_services`, `client_services` |
| `lib/actions/attendance.ts` | Direct `upsert` on `attendance_logs` |
| `lib/actions/work-done.ts` | Direct `insert` on `task_workdone` |
| `lib/actions/staff-capabilities.ts` | Direct `upsert` on `staff_capabilities` |

**Mitigating factor:** Many of these are simple CRUD with no business logic, so a Service layer would be a pass-through. However, the architecture rule exists for a reason: centralizing data access makes testing, mocking, and schema changes easier.

### 4.2 Auth / Capability Gating

**Grade: C**

**Actions missing `requireCapability` entirely:**

| Action | Current Gate | Risk |
|---|---|---|
| `exportTableDataAction` | `requireUser()` only | Any logged-in user (including client) can export arbitrary data |
| `saveSavedViewAction` | `requireUser()` only | No capability check |
| `listNotificationsAction` | `requireUser()` only | No capability check |
| `checkInAction` / `checkOutAction` | `requireRole` only | No `attendance.manage` capability |
| `requestLeaveAction` | `requireRole` only | No `leave.request` capability |
| `getBizlensReports` | `requireRole` only | No `bizlens.view` capability |

### 4.3 Input Validation

**Grade: C**

**~15+ Actions accept raw untyped input with no Zod schema:**

| Action | Input | Risk |
|---|---|---|
| `addTaskNoteAction` | `{ task_id: string; body: string }` | No UUID validation |
| `assignTaskAction` | `{ task_id: string; assigned_to?: string }` | No UUID validation |
| `softDeleteTaskAction` | `taskId: string` | No UUID validation |
| `softDeleteClient` | `id: string` | No UUID validation |
| `promoteToAdminAction` | `userId: string` | No UUID validation |
| `exportTableDataAction` | `rows: Record<string, any>[]` | Accepts arbitrary nested objects from frontend |

### 4.4 Error Handling

**Grade: C**

**Unhandled throws leaking to frontend:**
- `lib/actions/bizlens-actions.ts:42` — `getBizlensReports` has no `try/catch`, does not return `ActionResult`
- `lib/actions/bizlens-actions.ts:47` — `getBizlensReport` same issue

**Copy-paste audit bug:**
- `lib/actions/admin-hierarchy.ts:33-34` — `promoteToAdminAction` writes **both** `admin.promote` AND `admin.demote` audit records

### 4.5 Audit Logging

**Grade: D**

Many destructive/state-changing actions lack `writeAudit`:

| File | Missing Actions |
|---|---|
| `lib/actions/tasks.ts` | `transitionTaskAction`, `addTaskNoteAction`, `assignTaskAction`, `updateTaskLabelsAction`, `updateTaskCustomFieldsAction`, `updateTaskBillingAction`, `reopenTaskAction` |
| `lib/actions/clients.ts` | `createClientGroup`, `updateClientGroup`, `deleteClientGroup` |
| `lib/actions/services.ts` | All link/unlink actions |
| `lib/actions/work-done.ts` | All work-done actions |
| `lib/actions/attendance.ts` | `checkInAction`, `checkOutAction` |
| `lib/actions/leave.ts` | `requestLeaveAction` |

### 4.6 Rate Limiting

**Grade: D**

Only **6 endpoints** have rate limiting:
- `revealCredentialAction` — 10/min
- `sendPasswordResetAction` — 3/5min
- `requestLeaveAction` — 10/min
- `cmdk/search` API — 30/min
- `services` API — 60/min
- `task-templates` API — 60/min

**Missing:** All bulk actions (`bulkCreateTasksAction`, `bulkDeleteClients`), all query/message creation, all client creation/update.

### 4.7 N+1 Queries

**Grade: C**

| Location | Issue |
|---|---|
| `lib/repositories/tasks.ts:349-359` | `enrichTasksWithProgress` calls `getTaskStepCompletion(t.id)` for each task individually. 100 tasks = 101 queries. |
| `lib/actions/tasks.ts:553-587` | `bulkCreateTasksAction` loops `client_ids` and queries `clients` one-by-one inside the loop. |
| `lib/actions/tasks.ts:623-651` | `bulkUpdateTasksAction` fetches each task individually via `taskRepo.getTask(taskId)`. |

### 4.8 Race Conditions

**Grade: C**

| Location | Issue |
|---|---|
| `lib/actions/tasks.ts:247-280` | `updateTaskLabelsAction`: `delete()` all labels then `insert()` new ones — two non-atomic operations |
| `lib/actions/tasks.ts:290-319` | `updateTaskCustomFieldsAction`: loop of `delete`/`upsert` per field — non-atomic |
| `lib/actions/notices.ts:36-49` | `upsertNoticeAction`: reads prior status, then updates — race between read and write |
| `lib/actions/queries.ts:68-82` | `replyQueryAction`: inserts message, then updates query status — two separate writes |

---

## 5. API Routes Audit

### 5.1 Critical Open Endpoint

| Route | Auth | Severity |
|---|---|---|
| `app/api/sub-services/[id]/sop-steps/route.ts` | **NONE** — completely unauthenticated | 🔴 Critical |

This endpoint returns SOP steps for any `sub_service_id` without any auth check.

### 5.2 Fail-Open Endpoints

| Route | Issue |
|---|---|
| `app/api/notifications/unread/route.ts` | Returns `200` with empty data when unauthenticated (should be `401`) |
| `app/api/clients/[id]/sub-services/route.ts` | Returns `200` with empty data when unauthenticated |
| `app/api/sub-services/route.ts` | Uses `requireRole` which **redirects** on failure (returns HTML), not JSON `401` |

### 5.3 Well-Protected Endpoints

| Route | Method | Status |
|---|---|---|
| `app/api/cmdk/search/route.ts` | `getCurrentUser()` + 401 + rate limit | ✅ |
| `app/api/services/route.ts` | `getCurrentUser()` + 401 + rate limit | ✅ |
| `app/api/task-templates/route.ts` | `getCurrentUser()` + 401 + rate limit | ✅ |
| `app/api/cron/*` | Cron header / `CRON_SECRET` | ✅ |

---

## 6. Security Audit

### 6.1 RLS Policies

**Strong overall.** 72/73 tables have RLS enabled. Policies in `db/rls-additive.sql` and migration files cover the main access patterns. The `global_audit_log` table has RLS enabled but no policies — this is intentional since writes are done via service-role client.

### 6.2 CSP Headers

Current CSP in `next.config.js`:
```
script-src 'self' 'unsafe-eval' 'unsafe-inline'
style-src 'self' 'unsafe-inline' fonts.googleapis.com
```

`'unsafe-inline'` for scripts is necessary for Next.js but weakens XSS protection. Consider adding nonces or a strict hash policy if feasible. `'unsafe-eval'` is required for Supabase realtime client.

**Missing directives:**
- `base-uri 'self'` — prevents `<base>` tag attacks
- `form-action 'self'` — prevents form submission to external sites

### 6.3 Credentials Vault Encryption

**Grade: A**

`lib/services/encryption.ts` implements AES-256-GCM correctly:
- 12-byte random IV per encryption
- Auth tag included in ciphertext format
- Version prefix (`v1`) for forward compatibility
- Key length validation (exactly 32 bytes)

### 6.4 Service-Role Key Usage

**Grade: B**

Justified uses:
- `createTeamMemberAction` — needs Supabase Auth admin API
- `removeTeamMemberAction` — needs Supabase Auth admin API
- `notify()` service — cross-user notification inserts

Questionable uses:
- `createTaskAction` template/SOP step seeding — could use `createClient()` with proper RLS policies
- `loadTemplateStepsAction` / `loadSopStepsAction` — user-initiated, bypasses RLS

### 6.5 XSS Prevention

**Grade: B+**

App code: No `dangerouslySetInnerHTML` in app code. Round 1 removed the XSS vector in insights.

**Marketing pages:** `app/(marketing)/about/page.tsx:71` and `app/(marketing)/layout.tsx:39` use `dangerouslySetInnerHTML` for JSON-LD structured data. This is safe (static, self-generated JSON).

**🔴 Email HTML injection:**
- Digest emails and DSC alert emails construct HTML with user content (client names, task titles, notice subjects) without HTML escaping
- A client named `<script>alert('xss')</script>` would be rendered in email HTML
- **Fix:** Escape all user content before interpolating into email HTML templates

**Weak email validation:**
- Email format check uses a weak `@` presence test instead of a proper regex or Zod email schema

### 6.6 SQL Injection

**Grade: A**

All database access is via Supabase JS client with parameterized queries. No raw SQL strings constructed from user input.

### 6.7 Secrets Management

**Grade: A**

- `SUPABASE_SERVICE_ROLE_KEY` — no `NEXT_PUBLIC_` prefix ✅
- `CREDENTIALS_KEY` — no `NEXT_PUBLIC_` prefix ✅
- `RESEND_API_KEY` — no `NEXT_PUBLIC_` prefix ✅
- `CRON_SECRET` — no `NEXT_PUBLIC_` prefix ✅

Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public — correct.

### 6.8 File Upload Security

**Grade: C**

No code-level file upload validation was found. The application uses Supabase Storage for documents, but:
- No MIME-type allowlist validation in code
- No file size limit enforcement in code
- No virus scanning integration
- **Must verify:** Storage bucket RLS policies, signed-URL enforcement, and bucket-level size limits in Supabase dashboard

### 6.8 Middleware

`middleware.ts` only handles session refresh via `updateSession()`. Auth redirection is done at the layout level. This is correct — middleware should be minimal for performance.

**⚠️ Stale JWT metadata after role demotion:**
- The middleware and layouts trust JWT metadata for role checks
- When a user is demoted (e.g., admin → team), their JWT still contains the old `role` claim until the session is refreshed or expires
- The `app/admin/layout.tsx` gate could be bypassed during the JWT stale window
- **Fix:** Always verify the live DB role in `requireRole()` rather than trusting the JWT claim alone

---

## 7. Tests & Quality Audit

### 7.1 Test Coverage

**Grade: D**

| Test File | Coverage | Status |
|---|---|---|
| `__tests__/bizlens-service.test.ts` | 12 tests — contribution margin, break-even, WCC, score, risk, insights | ✅ Good |
| `__tests__/runtime-safety.test.ts` | 49 tests — cache usage, schema consistency, pagination, page imports | ✅ Good |
| `__tests__/compliance-calendar-engine.test.ts` | Compliance engine | ✅ |
| `__tests__/encryption.test.ts` | Encryption round-trip | ✅ |
| `__tests__/group-f-polish.test.ts` | **Duplicates existing tests** — should be removed or replaced | ⚠️ |
| `__tests__/task-control-guardrails.test.ts` | Task guardrails | ✅ |

**Critical gaps:**
- **Zero tests for Server Actions** — 41 action files, zero test coverage
- **Zero tests for repository functions** — all DB access is untested
- **Zero tests for RLS policies** — only manual checklist in `memory/DPDP_AND_SECURITY.md`
- **Zero integration tests for auth flows**
- **Zero E2E tests** — Playwright is in `package.json` but unused
- **Zero tests for the credentials encryption/decryption round-trip** (file exists but coverage unknown)

### 7.2 Lint & TypeScript

**ESLint: Not configured.**
- `npm run lint` exists in `package.json` but **no `.eslintrc.json` or `eslint.config.js` is present**
- Next.js default rules may apply, but without a config file, lint behavior is unpredictable
- **Fix:** Add a minimal `.eslintrc.json` with `next/core-web-vitals`

**TypeScript:**
- `tsc --noEmit` passes ✅
- Build is clean with zero warnings ✅
- **420 occurrences of `as any`** across the codebase — many suppress real type errors

### 7.3 Type Safety

**420 occurrences of `as any`** across the codebase. Many are in legitimate places (Supabase query result typing), but some suppress real type errors.

**Typed as `any` but internally validated:**
- `lib/actions/task-custom-fields.ts` uses `input: any` on multiple actions but calls `safeParse` internally. The `any` type defeats TypeScript safety at call sites.

### 7.4 Dead Code

`find-dead-code.js` exists. Preliminary scan shows **36 unused exports**. Some likely real dead components.

**Potentially unused CSS animations:** `word-reveal`, `magnetic-button`, `layered-stack-parallax` — verify usage or remove.

### 7.5 CI / Automation

**No CI pipeline exists.** No `.github/workflows/`, no `vercel.json` deployment checks, no automated test runs on PR.

**Recommended CI pipeline:**
```yaml
# .github/workflows/ci.yml
- npm run lint
- npx tsc --noEmit
- npm test
- npm run build
```

### 7.5 Dependencies

**npm audit:** 3 vulnerabilities (1 moderate PostCSS XSS, 2 high xlsx prototype pollution/ReDoS).

**Next.js 14.2.35:** Many high-severity advisories. Most do not apply to Vercel deployment (not self-hosted, no rewrites, no beforeInteractive scripts, no CSP nonces). Upgrading to Next.js 16 would be a breaking change.

**xlsx:** No fix available. Used only for admin-uploaded imports (trusted user surface). Acceptable risk.

---

## 8. Design & UX Assessment

### 8.1 Appropriateness for CA/CS Practice

**Grade: A-**

The tool is well-suited for its target user base:

**Strengths:**
- **Role-based access** (admin/team/client) correctly models a professional services firm
- **Capability grants** allow fine-grained delegation without making everyone an admin
- **Portal visibility** lets the firm control what each client sees
- **Compliance calendar** is the killer feature for Indian CA/CS firms (GST/TDS/IT filing deadlines)
- **BizLens** provides financial intelligence that differentiates from generic practice management tools
- **Mobile-first client portal** with bottom-tab nav is appropriate for business owners checking status on-the-go
- **Command palette (Cmd+K)** is a power-user feature that staff will appreciate

**Weaknesses:**
- **Form density** in BizLens input form is overwhelming — 334 lines of form fields without progressive disclosure
- **Task detail shell** tries to do too much on one screen (metadata, description, notes, activity, time logs, billing)
- **Client detail shell** lacks a clear information hierarchy
- **No empty states** for many lists — users see blank white when no data exists

### 8.2 User Flow Issues

| Flow | Issue |
|---|---|
| Team member creates client | Links to `/admin/clients/new` — fails if team lacks `clients.create` capability |
| Client views notices | `/portal/notices` exists but `/portal/notices/[id]` does not — deep-link 404 |
| Task creation | `new-task-dialog.tsx` fetches templates/SOPs with `.catch(() => set...([]))` — silent failure |
| Notifications | `notifications-bell.tsx` silently fails on API error — shows 0 instead of error |

### 8.3 Visual Consistency

The `stone`/`zinc` mixing creates a "almost but not quite" feeling. A user won't file a bug, but the app feels slightly unpolished. Standardizing on one scale and one radius (`rounded-xl` = 12px, not 20px) would make the app feel significantly more cohesive.

---

## 9. Performance Assessment

### 9.1 Bundle Size

First Load JS shared: **87.7 kB** — excellent for a Next.js app.

Largest pages:
- `/team/tasks` — 207 kB (table interactivity)
- `/admin/tasks` — 196 kB
- `/team/work` — 197 kB

### 9.2 Data Fetching

- Server Components correctly handle data fetching
- No `unstable_cache` or `cache()` wrapping `createClient()` (fixed in Round 1)
- ECharts is dynamically imported with `ssr: false` — correct

### 9.3 N+1 Impact

The `enrichTasksWithProgress` N+1 is the most impactful. For a team member viewing 50 tasks (default pagination), this causes 51 queries. With 10 concurrent users, that's 510 queries for one screen load. **This should be the top performance fix.**

---

## 10. Prioritized Recommendations

### 🔴 P0 — Fix Before Production

| # | Issue | File(s) | Effort |
|---|---|---|---|
| 1 | **Fix broken audit logging** — `global_audit_log` has no authenticated INSERT policy; `writeAudit()` uses regular client | `db/rls-2026-05-14-close-gaps.sql` or `lib/services/audit-service.ts` | 15 min |
| 2 | **Fix `all_work_items` view data leak** — soft-deleted queries still visible | `db/schema-all-work-items.sql:103` | 10 min |
| 3 | **Close completely open API endpoint** | `app/api/sub-services/[id]/sop-steps/route.ts` | 10 min |
| 4 | **Fix audit bug** — `promoteToAdminAction` logs `admin.demote` on promote | `lib/actions/admin-hierarchy.ts:34` | 2 min |
| 5 | **Add Zod param validation to all dynamic routes** | All `[param]/page.tsx` | 2 hrs |
| 6 | **Add defense-in-depth auth to portal detail pages** | `app/portal/tasks/[id]/page.tsx`, `app/portal/queries/[id]/page.tsx` | 15 min |
| 7 | **Fix N+1 in task progress enrichment** | `lib/repositories/tasks.ts:349-359` | 30 min |
| 8 | **Add capability gates to export/saved-views/notifications** | `lib/actions/export.ts`, `lib/actions/saved-views.ts`, `lib/actions/notifications.ts` | 30 min |
| 9 | **Escape user content in email HTML** | `lib/email/` digest and alert templates | 30 min |
| 10 | **Fix middleware stale JWT** — verify live DB role on every `requireRole()` call | `lib/auth/require-role.ts` | 1 hr |
| 11 | **Remove `'use client'` from UI primitives** | `components/ui/*.tsx` | 1 hr |

### 🟡 P1 — High Impact, Medium Effort

| # | Issue | File(s) | Effort |
|---|---|---|---|
| 12 | **Standardize color palette** — replace all `stone-*` with `zinc-*` | 77+ files | 3 hrs |
| 13 | **Refactor top forms to RHF+Zod** | `new-task-dialog.tsx`, `task-detail-shell.tsx`, `bizlens/input-form.tsx` | 1 day |
| 14 | **Add `writeAudit` to all destructive actions** | ~25 actions | 2 hrs |
| 15 | **Add rate limiting to bulk actions** | `lib/actions/tasks.ts`, `lib/actions/clients.ts` | 30 min |
| 16 | **Fix race conditions** — batch label/field updates atomically | `lib/actions/tasks.ts` | 2 hrs |
| 17 | **Extract monolithic components** | `app-shell.tsx`, `task-detail-shell.tsx` | 1 day |
| 18 | **Add loading skeletons for detail views** | `task-detail-shell.tsx`, `client-detail-shell.tsx`, `bizlens/output-dashboard.tsx` | 2 hrs |
| 19 | **Remove `main { animation: pageIn }`** | `app/globals.css` | 5 min |
| 20 | **Fix `rounded-[20px]` → `rounded-xl`** | `components/ui/card.tsx`, `globals.css` | 15 min |
| 21 | **Align `permission_requests` FK** to `users_profile(id)` | `db/schema-permission-requests.sql` | 15 min |
| 22 | **Add missing indexes** (reports_to, manager_id, notice_id, task_template_id) | `db/migrations/` | 30 min |
| 23 | **Add partial unique index for prime admin** | `db/migrations/` | 10 min |
| 24 | **Configure ESLint** — add `.eslintrc.json` with `next/core-web-vitals` | Root | 15 min |
| 25 | **Add CI pipeline** — GitHub Actions for lint, typecheck, test, build | `.github/workflows/ci.yml` | 30 min |

### 🟢 P2 — Polish & Hygiene

| # | Issue | File(s) | Effort |
|---|---|---|---|
| 26 | **Add `aria-label` to search trigger and user menu** | `components/shell/app-shell.tsx` | 10 min |
| 27 | **Fix hardcoded widths on mobile** | `task-column.tsx`, `advanced-task-filters.tsx` | 30 min |
| 28 | **Add `not-found.tsx` to root and account** | `app/not-found.tsx`, `app/account/not-found.tsx` | 20 min |
| 29 | **Add `force-dynamic` to missing auth pages** | `admin/bizlens/[reportId]/input`, `admin/tasks/import`, `admin/settings` | 10 min |
| 30 | **Consolidate migration-only tables into schema files** | `bizlens_period_snapshots`, `gst_monthly_data`, etc. | 1 hr |
| 31 | **Add RLS to `inward_outward_register` or remove from schema** | `db/rls-additive.sql` or `db/schema.sql` | 15 min |
| 32 | **Write tests for Server Actions** | `lib/actions/*.ts` | 2 days |
| 33 | **Add `shimmer` CSS class or remove from skeleton** | `components/ui/skeleton.tsx`, `globals.css` | 10 min |
| 34 | **Create `/portal/notices/[id]` route** | New file | 1 hr |
| 35 | **Tighten CSP** — add `base-uri 'self'` and `form-action 'self'` | `next.config.js` | 5 min |
| 36 | **Add `ON DELETE` actions to FKs** | `db/schema.sql` | 1 hr |
| 37 | **Add CHECK constraints** (GSTIN length, date ranges, etc.) | `db/schema.sql` | 1 hr |
| 38 | **Remove or document `client_communication_log`** | `db/schema.sql` | 10 min |
| 39 | **Remove duplicate `group-f-polish.test.ts`** | `__tests__/group-f-polish.test.ts` | 5 min |
| 40 | **Reduce `as any` casts** — type repository boundaries properly | `lib/repositories/*.ts`, `lib/actions/*.ts` | 1 day |

---

## Appendix A: Complete Table Inventory

| Table | RLS Enabled | Has Policies | Soft Delete | Notes |
|---|---|---|---|---|
| attendance_logs | ✅ | ✅ | ❌ | Time-series, OK |
| benchmarks | ✅ | ❌ | ❌ | Verify if needs policies |
| billing_entities | ✅ | ✅ | ❌ | |
| bizlens_data | ✅ | ✅ | ❌ | |
| bizlens_period_snapshots | ✅ | ✅ | ❌ | Migration-only table |
| client_communication_log | ✅ | ✅ | ❌ | |
| client_compliance_profiles | ✅ | ✅ | ❌ | |
| client_feature_flags | ✅ | ❌ | ❌ | Verify if needs policies |
| client_groups | ✅ | ✅ | ❌ | |
| client_import_batches | ✅ | ✅ | ❌ | |
| client_lifecycle_stage | ✅ | ❌ | ❌ | Verify if needs policies |
| client_portal_visibility | ✅ | ✅ | ❌ | |
| client_services | ✅ | ✅ | ❌ | |
| client_sub_services | ✅ | ✅ | ❌ | |
| client_users | ✅ | ✅ | ❌ | |
| clients | ✅ | ✅ | ✅ | |
| compliance_calendar_events | ✅ | ✅ | ❌ | |
| compliance_calendar_rules | ✅ | ✅ | ❌ | |
| compliance_insights | ✅ | ❌ | ❌ | Verify if needs policies |
| compliance_status | ✅ | ✅ | ✅ | Migration added soft-delete |
| cost_centres | ✅ | ✅ | ❌ | |
| credentials | ✅ | ✅ | ✅ | |
| document_requests | ✅ | ✅ | ❌ | |
| documents | ✅ | ✅ | ❌ | |
| dsc_records | ✅ | ✅ | ❌ | |
| engagement_letters | ✅ | ❌ | ❌ | Verify if needs policies |
| financial_data | ✅ | ✅ | ❌ | |
| firm_profile | ✅ | ❌ | ❌ | Verify if needs policies |
| global_audit_log | ✅ | ❌ | ❌ | Intentional — service-role writes |
| gst_data_entries | ✅ | ✅ | ❌ | |
| gst_filings | ✅ | ✅ | ✅ | Migration added soft-delete |
| gst_monthly_data | ✅ | ❌ | ❌ | Migration-only table |
| hearings | ✅ | ✅ | ✅ | Migration added soft-delete |
| holidays | ✅ | ✅ | ❌ | |
| income_tax_slabs | ✅ | ❌ | ❌ | Migration-only table |
| inward_outward_register | ❌ | ❌ | ❌ | **MISSING RLS** |
| it_filings | ✅ | ✅ | ✅ | Migration added soft-delete |
| leave_balances | ✅ | ✅ | ❌ | |
| leave_requests | ✅ | ✅ | ❌ | |
| notices | ✅ | ✅ | ❌ | |
| notification_preferences | ✅ | ✅ | ❌ | |
| notifications | ✅ | ✅ | ❌ | |
| payroll_adjustments | ✅ | ❌ | ❌ | Verify if needs policies |
| payroll_runs | ✅ | ✅ | ❌ | |
| permission_requests | ✅ | ✅ | ❌ | |
| profit_centres | ✅ | ✅ | ❌ | |
| queries | ✅ | ✅ | ✅ | Migration added soft-delete |
| query_messages | ✅ | ✅ | ❌ | |
| saved_views | ✅ | ✅ | ❌ | |
| service_categories | ✅ | ✅ | ❌ | |
| services | ✅ | ✅ | ❌ | |
| solution_log | ✅ | ✅ | ❌ | |
| staff_capabilities | ✅ | ✅ | ❌ | |
| staff_payroll_settings | ✅ | ✅ | ❌ | |
| staff_role_template_capabilities | ✅ | ✅ | ❌ | |
| staff_role_templates | ✅ | ✅ | ❌ | |
| sub_service_document_request_templates | ✅ | ✅ | ❌ | |
| sub_service_sop_steps | ✅ | ✅ | ❌ | |
| sub_services | ✅ | ✅ | ❌ | |
| task_activity | ✅ | ✅ | ❌ | Audit trail, OK |
| task_custom_field_definitions | ✅ | ✅ | ❌ | |
| task_custom_field_values | ✅ | ✅ | ❌ | |
| task_document_requests | ✅ | ✅ | ❌ | |
| task_label_assignments | ✅ | ✅ | ❌ | |
| task_labels | ✅ | ✅ | ❌ | |
| task_notes | ✅ | ✅ | ❌ | |
| task_steps | ✅ | ✅ | ❌ | |
| task_template_steps | ✅ | ❌ | ❌ | Migration-only table |
| task_templates | ✅ | ✅ | ❌ | |
| task_workdone | ✅ | ✅ | ❌ | |
| tasks | ✅ | ✅ | ✅ | |
| tds_filings | ✅ | ✅ | ✅ | Migration added soft-delete |
| team_client_assignment | ✅ | ✅ | ❌ | |
| user_billing_entity_access | ✅ | ✅ | ❌ | |
| users_profile | ✅ | ✅ | ❌ | Central identity table |
| vcfo_snapshots | ✅ | ✅ | ❌ | |
| vendor_gst_filings | ✅ | ❌ | ❌ | Verify if needs policies |
| vendors | ✅ | ✅ | ❌ | |
| weekly_timesheet_submissions | ✅ | ❌ | ❌ | Migration-only table |
| work_done | ✅ | ❌ | ❌ | Legacy table |

---

*End of Report*
