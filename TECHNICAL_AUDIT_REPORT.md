# Comprehensive Technical Audit Report
**Project:** The Fiscal Fulcrum Portal (Next.js 14)  
**Date:** 2026-06-02  
**Auditor:** Kimi Code CLI  

---

## 1. BUILD INTEGRITY

### 1.1 `npm run build` — FAILED ❌
**Exit code:** 1 (webpack compilation failure)

**Critical Errors:**
- **`app/admin/tasks/tasks-table.tsx`** is missing the `"use client"` directive but imports and uses React hooks and client-only libraries.
  - `useState`, `useMemo`, `useEffect`, `useRef` (line 1)
  - `useRouter`, `usePathname`, `useSearchParams` (line 5)
  - `useSWRInfinite` (line 17)
  - `useVirtualizer` (line 18)

**Build Output Excerpt:**
```
Failed to compile.
./app/admin/tasks/tasks-table.tsx
Error: You're importing a component that needs useState. It only works in a Client Component but none of its parents are marked with "use client"...
```

**Impact:** Production deployment is completely blocked.

---

### 1.2 `npx tsc --noEmit` — FAILED ❌
**Exit code:** 2 (5 TypeScript errors)

| File | Line | Error |
|------|------|-------|
| `app/admin/page.tsx` | 73 | `TS2304: Cannot find name 'attendanceToday'.` |
| `app/admin/page.tsx` | 74 | `TS2304: Cannot find name 'attendanceToday'.` |
| `app/admin/page.tsx` | 75 | `TS2304: Cannot find name 'teamMembers'.` |
| `app/admin/tasks/tasks-table.tsx` | 15 | `TS2305: Module '"@/lib/actions/tasks"' has no exported member 'fetchTasksPageAction'.` |
| `app/admin/tasks/tasks-table.tsx` | 118 | `TS2304: Cannot find name 'isLoading'.` |

**Root Cause Analysis:**

1. **`app/admin/page.tsx` (lines 55–69):** The `Promise.all` array has **13 elements**, but the left-hand destructuring array only has **12 slots** (indices 0–11). The results of `listAttendanceForDate(todayIso)` (index 12) and `listTeamUsers()` (index 13) are never destructured, so `attendanceToday` and `teamMembers` are undefined variables on lines 73–75.

2. **`app/admin/tasks/tasks-table.tsx` (line 15):** Imports `fetchTasksPageAction` from `@/lib/actions/tasks`, but this function **does not exist** in that module. Verified via full-text search: zero exports found.

3. **`app/admin/tasks/tasks-table.tsx` (line 118):** Uses `isLoading`, but `useSWRInfinite` returns `isValidating`, not `isLoading`. The variable is never declared.

---

### 1.3 `npm run lint` — FAILED ❌
**Exit code:** 1

```
ESLint must be installed: npm install --save-dev eslint
```

**Impact:** No static code analysis is currently possible. ESLint is completely missing from `devDependencies`.

---

## 2. SCHEMA vs DATABASE CONSISTENCY

### 2.1 Tables Missing from Base `schema.sql`
The base `db/schema.sql` (v3, "locked") defines 46 tables. However, **25+ tables** exist only in migration files or additive schema files and are **not present** in the canonical base schema:

| Table | Location |
|-------|----------|
| `task_template_steps` | `db/migrations/2026-05-13-group-b-service-hierarchy.sql:19` |
| `income_tax_slabs` | `db/migrations/2026-05-14-income-tax-slabs.sql:2` |
| `bizlens_period_snapshots` | `db/migrations/2026-05-14-bizlens-period-snapshots.sql:2` |
| `work_done` | `db/migrations/2026-05-14-work-done.sql:2` |
| `firm_profile` | `db/migrations/2026-05-14-portal-gating.sql:29` |
| `gst_monthly_data` | `db/migrations/2026-05-14-portal-gating.sql:52` |
| `profit_centres` | `db/schema-v3-3.sql:89` |
| `cost_centres` | `db/schema-v3-3.sql:97` |
| `billing_entities` | `db/schema-v3-3.sql:105` |
| `user_billing_entity_access` | `db/schema-v3-3.sql:129` |
| `compliance_calendar_rules` | `db/schema-v3-3.sql:188` |
| `client_compliance_profiles` | `db/schema-v3-3.sql:215` |
| `compliance_calendar_events` | `db/schema-v3-3.sql:248` |
| `document_requests` | `db/schema-v3-3.sql:284` |
| `sub_service_document_request_templates` | `db/schema-v3-3.sql:323` |
| `task_custom_field_definitions` | `db/schema-v3-3.sql:348` |
| `task_custom_field_values` | `db/schema-v3-3.sql:365` |
| `task_labels` | `db/schema-v3-3.sql:396` |
| `task_label_assignments` | `db/schema-v3-3.sql:404` |
| `task_workdone` | `db/schema-v3-3.sql:432` |
| `leave_balances` | `db/schema-hr-tables.sql:4` |
| `holidays` | `db/schema-hr-tables.sql:38` |
| `weekly_timesheet_submissions` | `db/schema-weekly-approval.sql:4` |
| `permission_requests` | `db/schema-permission-requests.sql:2` |
| `bizlens_data` | `db/schema-bizlens.sql:6` |

**Critical:** `schema-additions.sql` (v3.2) references `task_template_steps(id)` at **line 295** (`task_steps.source_template_step_id`), but this table is defined only in a migration file, not in the base schema or additions.

---

### 2.2 `v_unified_inbox` View — MISSING ❌
Full-text search across the entire repository found **zero occurrences** of `v_unified_inbox`. The view does not exist in any schema file, migration, or SQL script.

---

### 2.3 RLS Policy Gaps
Multiple tables have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` but have **zero policies** defined, meaning they are completely locked out for all authenticated users (or accessible only via service-role bypass):

| Table | RLS Enabled At | Policies? |
|-------|----------------|-----------|
| `global_audit_log` | `db/schema.sql:1390` + `rls-2026-05-14-close-gaps.sql:27` | ❌ **NONE** |
| `hearings` | `rls-2026-05-14-close-gaps.sql:60` | ❌ **NONE** |
| `staff_payroll_settings` | `2026-05-29-audit-fix-critical-rls.sql:267` | ❌ **NONE** |
| `payroll_adjustments` | `rls-2026-05-14-close-gaps.sql:51` | ❌ **NONE** |
| `client_lifecycle_stage` | `rls-2026-05-14-close-gaps.sql:96` | ❌ **NONE** |
| `engagement_letters` | `rls-2026-05-14-close-gaps.sql:84` | ❌ **NONE** |
| `vendor_gst_filings` | `rls-2026-05-14-close-gaps.sql:131` | ❌ **NONE** |
| `benchmarks` | `rls-2026-05-14-close-gaps.sql:140` | ❌ **NONE** |
| `firm_profile` | `rls-2026-05-14-close-gaps.sql:120` | ❌ **NONE** |
| `bizlens_period_snapshots` | `migrations/2026-05-14-bizlens-period-snapshots.sql:52` | ❌ **NONE** |
| `income_tax_slabs` | `migrations/2026-05-14-income-tax-slabs.sql:20` | ❌ **NONE** |
| `gst_monthly_data` | `migrations/2026-05-14-portal-gating.sql:88` | ❌ **NONE** |
| `work_done` | `migrations/2026-05-14-work-done.sql:21` | ❌ **NONE** |
| `inward_outward_register` | `db/schema.sql:786` | ❌ **NONE** (RLS not even enabled in base schema) |

**Note:** The `global_audit_log` gap is documented as "intentional — service-role writes" in `memory/COMPREHENSIVE_AUDIT_REPORT_2026-06-01.md`, but this means all client-side audit reads fail unless the service-role client is used.

---

### 2.4 Missing Indexes
The following tables/columns referenced in hot query paths lack indexes in the canonical schema:

- `tasks.is_deleted` — used in nearly every task query; indexed implicitly by partial indexes but no standalone index for soft-delete filtering.
- `tasks.period_year` — used in cron existence checks; no explicit index.
- `tasks.period_quarter` — same as above.
- `tasks.is_stuck` — queried in `app/admin/page.tsx` and task dashboards; no index.
- `tasks.is_verified` — no index.
- `tasks.is_billable` — no index.
- `tasks.client_approval_required` — added in v3.3; no index.
- `tasks.verification_status` — added in v3.3; no index.
- `compliance_calendar_events.due_date` — heavily queried for deadline views; no index in base schema (may be in migration `2026-05-20-performance-indexes.sql`).
- `work_done.task_id` — no index defined in migration.
- `work_done.user_id` — no index defined in migration.

---

## 3. SECURITY AUDIT

### 3.1 API Routes — Auth Checks

| Route | Auth Check | Status |
|-------|-----------|--------|
| `app/api/cmdk/search/route.ts` | `getCurrentUser()` + rate limit | ✅ |
| `app/api/notifications/unread/route.ts` | `getCurrentUser()` | ✅ |
| `app/api/services/route.ts` | `getCurrentUser()` + rate limit | ✅ |
| `app/api/sub-services/route.ts` | `requireRole(['admin', 'team'])` | ✅ |
| `app/api/task-templates/route.ts` | `getCurrentUser()` + rate limit | ✅ |
| `app/api/clients/[id]/sub-services/route.ts` | `getCurrentUser()` | ✅ |
| `app/api/sub-services/[id]/sop-steps/route.ts` | `getCurrentUser()` | ✅ |
| `app/api/bizlens/state/route.ts` | **NONE** | ❌ |

**Finding:** `app/api/bizlens/state/route.ts` (lines 13–18) has **no authentication check**. Although it returns HTTP 410 Gone, the request is processed and could be hit by unauthenticated callers. It should gate on `getCurrentUser()` before returning 410.

All **cron routes** have proper dual-auth checks (`x-vercel-cron` header + `CRON_SECRET` query param), with the exception of `refresh-compliance-events` which also accepts an `x-cron-secret` header and User-Agent check — this is acceptable defense-in-depth.

---

### 3.2 Service-Role Client in User-Facing Code
The service-role Supabase client **bypasses RLS entirely**. Per `AGENTS.md`, it must only be used in cron endpoints, webhooks, and one-off scripts. The following user-initiated code paths violate this rule:

| File | Line(s) | Context |
|------|---------|---------|
| `lib/actions/tasks.ts` | 59, 67 | `createTaskAction` seeds task steps via `createServiceClient()` |
| `lib/actions/tasks.ts` | 715 | `loadTemplateStepsAction` seeds steps via `createServiceClient()` |
| `lib/actions/tasks.ts` | 735 | `loadSopStepsAction` seeds steps via `createServiceClient()` |
| `lib/services/solution-log-service.ts` | 30 | Uses `createServiceClient()` for general reads/writes |
| `lib/services/notification-service.ts` | 30 | Uses `createServiceClient()` for notification writes |
| `lib/services/client-service.ts` | 40 | Uses `createServiceClient()` for client operations |
| `lib/services/compliance-calendar-engine.ts` | 311–312 | Dynamically imports `createServiceClient()` |
| `lib/services/audit-service.ts` | 16 | Uses `createServiceClient()` (intentional but noted) |

**Mitigation:** The task-step seeding in `lib/actions/tasks.ts` should either:
1. Use the standard server client and ensure the invoking user has `tasks.create` capability (RLS should permit admin/team insert on `task_steps`), or
2. Keep service-role but wrap in an explicit `writeAudit()` call documenting the bypass.

---

### 3.3 Middleware Completeness

**File:** `middleware.ts` + `lib/supabase/middleware.ts`

**What works:**
- Redirects logged-out users from `/portal`, `/team`, `/admin` to `/login`.
- Redirects logged-in users hitting `/login` to their role-based home.
- Redirects users hitting wrong role-prefixes to their home.
- Cookie refresh via `createServerClient`.

**Gaps:**
1. **API routes are not protected by middleware.** The `protectedPrefixes` array only includes `/portal`, `/team`, `/admin`. All `/api/*` routes bypass middleware entirely. While most API routes self-protect, `app/api/bizlens/state/route.ts` does not.
2. **`ROLE_NEUTRAL_PREFIXES` is incomplete.** It includes `/api/cmdk`, `/api/notifications`, `/api/sub-services`, but omits `/api/services`, `/api/task-templates`, `/api/clients/*/sub-services`, and `/api/sub-services/*/sop-steps`. However, because these don't start with `/portal|/team|/admin`, they bypass middleware anyway, so the gap is latent rather than active.
3. **No rate-limit enforcement in middleware.** Rate limiting is applied per-route, not globally.
4. **No Content Security Policy or security headers in middleware.** These are set in `next.config.js`, which is acceptable.

---

## 4. PERFORMANCE AUDIT

### 4.1 `as any` Casts
**Count:** ~450 occurrences across the entire repository (per grep). In application code alone (`app/`, `lib/`, `components/`), there are **200+ occurrences**.

**High-density files:**
- `app/admin/tasks/tasks-table.tsx` — lines 129, 130, 133, 134, 184, 234, 314, 387, 391, 394, 396, 412, 430
- `app/admin/page.tsx` — lines 73, 83, 85, 129, 176, 196, 257
- `lib/actions/tasks.ts` — lines 60, 68, 95, 99, 152, 157, 160, 184, 209, 213, 215, 253, 288, 383, 418, 451, 488, 491, 625, 690, 713, 716, 733, 736
- `lib/actions/work-done.ts` — lines 59, 65, 102, 108, 134, 137, 138, 139, 148, 176, 179, 180, 181, 200

**Impact:** These suppress real type errors, reduce IDE autocomplete effectiveness, and make refactoring hazardous.

---

### 4.2 Unused Imports / Dead Code

**Tool:** `unimported` (v1.31.0)

- **Unused dependencies:** 38 packages flagged, including:
  - `@radix-ui/react-*` (12 packages) — likely false positives because they are re-exported through `components/ui/*`
  - `framer-motion`, `recharts`, `echarts-for-react`, `xlsx`
  - `server-only`, `clsx`, `tailwind-merge`, `class-variance-authority` — likely false positives (used by shadcn/ui primitives)
  - `sonner`, `swr`, `@tanstack/react-virtual`, `@tanstack/react-table` — **legitimately used** in app code but flagged due to barrel re-exports

- **Unimported files:** 673 files flagged. This is largely a **false positive** for Next.js App Router because `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, and `route.ts` files are convention-based and never explicitly imported.

**Custom dead-code scan (`find-dead-code.js`):** This script exists but was not run during the audit. It may find exported components never imported.

---

### 4.3 Bundle Size Indicators

**File:** `next.config.js`

- `@next/bundle-analyzer` is configured but only activates when `ANALYZE=true`.
- `eslint.ignoreDuringBuilds: true` — ESLint is disabled during builds.
- No `output: 'standalone'` configured.
- No explicit webpack chunk splitting or `experimental.optimizePackageImports`.
- `images.formats` includes `avif` and `webp` — good.
- Security headers are comprehensive (CSP, X-Frame-Options, etc.) — good.

**Recommendation:** Add `output: 'standalone'` for Docker/Vercel production optimization, and consider `experimental.optimizePackageImports` for heavy packages like `recharts`, `lucide-react`, and `@radix-ui/react-*`.

---

### 4.4 `console.log` / `console.warn` in Production Code

**Production runtime code (not scripts):**

| File | Line | Statement |
|------|------|-----------|
| `lib/hooks/use-auto-save.ts` | 19 | `console.warn('Failed to rehydrate form state...')` |
| `lib/hooks/use-auto-save.ts` | 31 | `console.warn('Failed to save form state...')` |

**Impact:** These warnings will pollute the browser console in production and may leak internal state keys. They should be removed or replaced with a no-op in production builds.

**Scripts (acceptable):** Every file in `scripts/` and `audit/auto/` uses `console.log` / `console.error` — this is expected for CLI tooling.

---

## 5. SUMMARY OF CRITICAL ISSUES

| Priority | Issue | File(s) |
|----------|-------|---------|
| **P0** | Build completely fails (missing "use client") | `app/admin/tasks/tasks-table.tsx:1` |
| **P0** | TypeScript errors block compilation | `app/admin/page.tsx:73-75`, `app/admin/tasks/tasks-table.tsx:15,118` |
| **P0** | ESLint is not installed | `package.json` (missing `eslint` devDep) |
| **P1** | Service-role client used in user-facing Server Actions | `lib/actions/tasks.ts:59,67,715,735` |
| **P1** | API route has no auth check | `app/api/bizlens/state/route.ts` |
| **P1** | RLS enabled but zero policies on 13+ tables | Various (see Section 2.3) |
| **P1** | `task_template_steps` table missing from canonical schema | `schema-additions.sql:295` references it |
| **P2** | ~450 `as any` casts suppressing types | Entire codebase |
| **P2** | `console.warn` in production hook | `lib/hooks/use-auto-save.ts:19,31` |
| **P2** | Missing `output: 'standalone'` and chunk optimization | `next.config.js` |

---

## 6. RECOMMENDED IMMEDIATE ACTIONS

1. **Fix build:** Add `"use client"` to the top of `app/admin/tasks/tasks-table.tsx`.
2. **Fix TypeScript:**
   - In `app/admin/page.tsx`, add destructured variables for `listAttendanceForDate` and `listTeamUsers` results.
   - In `app/admin/tasks/tasks-table.tsx`, either export `fetchTasksPageAction` from `lib/actions/tasks.ts` or remove the import and virtualized fetching logic.
   - Replace `isLoading` with `isValidating` (or derive `isLoading` from `!data && isValidating`).
3. **Install ESLint:** `npm install -D eslint @next/eslint-plugin-next` and configure `.eslintrc.json`.
4. **Audit service-role usage:** Replace `createServiceClient()` in `lib/actions/tasks.ts` with the standard server client if RLS policies permit; if not, add an audit log entry for every bypass.
5. **Add auth to API route:** Gate `app/api/bizlens/state/route.ts` on `getCurrentUser()` before returning 410.
6. **Schema reconciliation:** Either consolidate all migration tables into `schema.sql` + `schema-additions.sql`, or maintain a `schema-full.sql` that represents the actual production state.
7. **RLS policy backfill:** Write policies for `hearings`, `payroll_adjustments`, `staff_payroll_settings`, `client_lifecycle_stage`, `engagement_letters`, `vendor_gst_filings`, `benchmarks`, `firm_profile`, and other locked-out tables.
8. **Remove production console warnings:** Strip or guard `console.warn` calls in `lib/hooks/use-auto-save.ts`.
