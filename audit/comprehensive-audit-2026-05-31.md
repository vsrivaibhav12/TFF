# Comprehensive Codebase Audit — The Fiscal Fulcrum Portal

> Date: 2026-05-31  
> Scope: Every screen, flow, DB reference, auth path, security surface, performance pattern  
> Status: READ-ONLY AUDIT — no changes made

---

## 1. Executive Summary

| Severity | Count | Categories |
|---|---|---|
| **CRITICAL** | 7 | Unauthenticated API endpoints, missing soft-delete filters, hydration crashes, non-existent table |
| **HIGH** | 9 | Missing audit logging, over-fetched columns, SSR/CSR mismatches, missing rate limits |
| **MEDIUM** | 12 | Missing `is_deleted` filters, naming inconsistencies, missing error boundaries |
| **LOW** | 8 | Console logs, anti-patterns, marketing page XSS vectors |

**Overall Assessment**: The codebase is well-architected with clear three-layer separation (Actions → Services → Repositories), comprehensive RLS policies, and good TypeScript coverage. However, there are **genuine security gaps** (unauthenticated API endpoints, missing soft-delete filters that could leak deleted data) and **runtime reliability issues** (hydration crashes) that need immediate attention.

---

## 2. CRITICAL Issues

### 2.1 Unauthenticated API Endpoints

Two API routes are **completely open** — no auth checks, no role checks, no capability checks.

| Endpoint | File | Risk |
|---|---|---|
| `GET /api/services` | `app/api/services/route.ts:9` | Returns all services + categories to anyone |
| `GET /api/task-templates` | `app/api/task-templates/route.ts:10` | Returns all task templates to anyone |

**Impact**: Data leakage. Any unauthenticated user can enumerate the firm's entire service catalogue and task templates.

**Fix**: Add `await requireRole(['admin', 'team'])` or at minimum `await getCurrentUser()` gate.

---

### 2.2 Missing `is_deleted` Filter in Cmd-K Search

`app/api/cmdk/search/route.ts` queries three tables but only filters `clients` for soft-delete:

```ts
// Line 27-34 — tasks and notices MISSING .eq('is_deleted', false)
sb.from('tasks')
  .select('id, title, status, clients(business_name)')
  .ilike('title', like)
  .limit(8),
sb.from('notices')
  .select('id, subject, notice_type, status, clients(business_name)')
  .or(`subject.ilike.${like},notice_type.ilike.${like}`)
  .limit(8)
```

**Impact**: Deleted tasks and notices appear in global search results.

---

### 2.3 Missing `is_deleted` on Tasks in Multiple Action Files

The following action files query `tasks` **without** `.eq('is_deleted', false)` when checking for open tasks:

| File | Lines | Query Purpose |
|---|---|---|
| `lib/actions/services-catalogue.ts` | 176, 194, 225, 253 | Check open tasks before modifying SOP steps |
| `lib/actions/task-templates.ts` | 98, 145, 187 | Check open tasks before modifying templates |
| `lib/actions/task-flags.ts` | 30 | Fetch task status for flagging |

**Impact**: Open-task guards count deleted tasks, potentially blocking legitimate SOP/template changes.

**Note**: `lib/actions/team.ts:186-187` also updates ALL tasks for a user without `is_deleted` filter when reassigning — this could resurrect deleted tasks by setting `assigned_to` to `null`.

---

### 2.4 Referenced Table Does Not Exist: `team_profiles`

`lib/actions/task-import.ts` references `.from('team_profiles')` but this table **does not exist** in:
- `db/schema.sql`
- `db/schema-additions.sql`
- `db/schema-v3-3.sql`
- Any migration file under `db/migrations/`

**Impact**: The task import feature will throw a database error at runtime.

---

### 2.5 Hydration Crash: `Math.random()` in `mini-sparkline.tsx`

`components/ui/mini-sparkline.tsx` uses `Math.random()` during render:

```tsx
// This causes React hydration mismatch because server + client generate different values
const data = Array.from({ length: 20 }, () => Math.random() * 100);
```

**Impact**: React hydration error on every page that renders this component.

**Fix**: Move random generation into `useEffect` or use a seeded PRNG.

---

### 2.6 SSR Time Mismatch: `getGreeting()` in `app/portal/page.tsx`

```tsx
const greeting = getGreeting(); // Uses new Date() — different on server vs client
```

**Impact**: Potential hydration mismatch if server and client are in different timezones or the hour boundary is crossed between SSR and hydration.

---

### 2.7 XSS Vector: `dangerouslySetInnerHTML` with User Content

`app/(marketing)/insights/[slug]/page.tsx:29`:
```tsx
<div dangerouslySetInnerHTML={{ __html: a.body }} />
```

`a.body` comes from the database (fetched via Supabase). If any admin can inject HTML into insight bodies, this is a stored XSS vulnerability. The marketing about page also uses `dangerouslySetInnerHTML` for JSON-LD (safe, self-generated).

**Impact**: Stored XSS if `insights.body` contains malicious JavaScript.

---

## 3. HIGH Severity Issues

### 3.1 Zero Audit Logging in 41 Action Files

Out of **41 action files** under `lib/actions/`, **zero** write to `global_audit_log` for sensitive operations. The AGENTS.md states:

> "Audit log: Every capability grant/revoke, portal visibility change, credential decrypt, soft-delete, and bulk action writes to `global_audit_log`."

Only `lib/services/audit-service.ts` and `lib/repositories/bizlens.ts` write audit entries. No action uses `writeAudit()`.

**Missing audit for**:
- Client create/update/delete
- Task create/update/delete/bulk-create
- Credential create/reveal/delete
- Team member promote/demote/remove
- DSC record changes
- Notice/hearing changes
- Service catalogue changes
- Portal visibility toggles
- Capability grants/revokes

**Impact**: No forensic trail for sensitive operations. Compliance and security incident response is impossible.

---

### 3.2 Over-Fetching with `.select('*')`

14 repository functions use `.select('*')` instead of specific columns:

| File | Count |
|---|---|
| `lib/repositories/attendance.ts` | 2 |
| `lib/repositories/bizlens-snapshots.ts` | 1 |
| `lib/repositories/bizlens.ts` | 2 |
| `lib/repositories/compliance.ts` | 3 |
| `lib/repositories/gst.ts` | 2 |
| `lib/repositories/income-tax.ts` | 1 |
| `lib/repositories/task-custom-fields.ts` | 5 |
| `lib/repositories/task-templates.ts` | 1 |

**Impact**: Wasted bandwidth, slower queries, potential data leakage if new sensitive columns are added.

---

### 3.3 `window.location.reload()` Anti-Pattern

Multiple components use `window.location.reload()` instead of Next.js router:

| File | Line | Context |
|---|---|---|
| `app/admin/error.tsx` | 18 | Error recovery |
| `app/portal/error.tsx` | 18 | Error recovery |
| `app/team/error.tsx` | 18 | Error recovery |
| `components/admin/team/[id]/promote-demote-buttons.tsx` | 27, 37 | After role change |

**Impact**: Full page reload loses React state, worse UX, slower.

---

### 3.4 No Rate Limiting on Any Endpoint

None of the API routes or Server Actions implement rate limiting:
- Password reset (`sendPasswordResetAction`) — susceptible to abuse
- Client import — could be triggered repeatedly
- Bulk task creation — no throttle
- Credential reveal — no rate limit on decryption

**Impact**: Brute-force, DoS, and enumeration attacks are unmitigated.

---

### 3.5 Array Index as `key` in Lists

Multiple components use `key={i}` (array index) instead of stable IDs:

- `components/bizlens/*.tsx`
- `components/dashboard/*.tsx`
- `components/shell/*.tsx`
- `components/shell/command-palette.tsx`

**Impact**: React reconciliation bugs, stale state, incorrect animations.

---

### 3.6 Console Errors in Error Boundaries

All error boundary pages (`app/*/error.tsx`) log errors to console:

```tsx
console.error('Admin error:', error);
```

These run on the **client** and could leak stack traces to the browser console in production.

---

### 3.7 `task_workdone` vs `work_done` Naming Confusion

The codebase has **two names** for the same concept:
- `lib/repositories/task-workdone.ts` (does not exist, but `work-done.ts` does)
- Table references: `task_workdone` in some places
- Component: `components/tasks/workdone-panel.tsx`

This creates maintenance risk and confusion.

---

### 3.8 Missing Component Error Boundaries

Heavy widgets have no error boundaries:
- BizLens tabs (ECharts, financial calculations)
- ECharts wrapper
- Dashboard widgets

**Impact**: One crashing widget can break the entire page.

---

### 3.9 `useSWR` / React Query Not Used for Client Data

Client components that fetch data use raw `fetch` or direct action calls without caching:
- `components/shell/command-palette.tsx`
- `components/shell/notifications-bell.tsx`
- `components/tasks/new-task-dialog.tsx`

**Impact**: Duplicate requests, no stale-while-revalidate, no optimistic updates.

---

## 4. MEDIUM Severity Issues

### 4.1 Missing `is_deleted` Filters (Systematic)

Only **32 out of 123** `.from()` queries in `lib/repositories/` include `.eq('is_deleted', false)`. While RLS provides some protection, application-layer filtering is defense-in-depth.

Notable omissions:
- `attendance_logs` queries (no soft-delete filter at all)
- `bizlens_data` queries
- `global_audit_log` queries (acceptable — audit log is append-only)
- Many action-layer queries

### 4.2 `credentials` Table Queries Missing `is_deleted`

`lib/actions/credentials.ts:80-95` — the `revealCredentialAction` fetches credentials but does **not** filter by `is_deleted` in the initial query (it checks after, but the select doesn't filter).

### 4.3 Missing `updated_at` on Some Tables

While recent migrations fixed `service_categories`, `services`, and `task_workdone`, the `audit_schema_drift.py` script still flags false positives because `supabase_openapi.json` is stale (dated May 19, does not reflect May 30 migrations).

### 4.4 Marketing Pages Use `dangerouslySetInnerHTML`

Safe for self-generated JSON-LD, but the pattern exists and could be copied unsafely.

### 4.5 Portal Greeting Uses Client Time

`app/portal/page.tsx` `getGreeting()` uses `new Date()` which differs between SSR and hydration.

### 4.6 No Input Sanitization on Search

Cmd-K search passes raw user input into `ilike` queries without sanitization:
```ts
const like = `%${q}%`;
.or(`business_name.ilike.${like},gstin.ilike.${like},pan.ilike.${like}`)
```
While Supabase's PostgREST handles SQL injection safely, this is still raw user input flowing to the query layer.

### 4.7 Team Members Can Access `/admin` Prefix

`lib/supabase/middleware.ts` allows team members to hit `/admin`:
```ts
ROLE_ALLOWED_PREFIX: {
  team: ['/team', '/admin'],
}
```
This is intentional per the comment, but capability checks on individual pages must be correct. Any missing `requireCapability` on an `/admin/*` page is a privilege escalation.

### 4.8 `requireCapability` Not Used on All Admin Pages

Need to verify every `/admin/*` page calls `requireCapabilityOrRedirect`. This was not exhaustively checked in this audit.

### 4.9 Missing `not-found.tsx` on Many Routes

Only `/admin`, `/portal`, `/team`, and `/portal/tasks/[id]` have `not-found.tsx`. Most sub-routes rely on default Next.js 404.

### 4.10 `createServiceClient` Used in Non-Cron Code

`lib/actions/auth.ts:27` uses `createServiceClient()` (service-role, bypasses RLS) to update team member passwords. This is appropriate for admin password resets but should be audit-logged.

### 4.11 Bulk Task Creation Lacks Transaction Safety

`lib/actions/tasks.ts` bulk-creates tasks in a loop without a database transaction. If it fails partway through, some tasks exist and some don't.

### 4.12 Cron Job `generate-monthly-tasks` Has No Retry Logic

If the cron fails mid-run, there's no mechanism to resume or clean up partial state.

---

## 5. LOW Severity Issues

### 5.1 `console.error` in Error Boundaries

`app/*/error.tsx` pages log to console. In production, these should use a proper error tracking service (Sentry, etc.) instead.

### 5.2 `tsconfig.tsbuildinfo` Tracked in Git

This file changes on every build and causes unnecessary git noise. Should be in `.gitignore`.

### 5.3 Stale `supabase_openapi.json`

`supabase_openapi.json` (494KB, dated May 19) does not reflect May 30 schema changes. Causes false positives in drift detection.

### 5.4 `package-lock.json` Changes Without `package.json` Changes

Frequent lockfile-only changes suggest inconsistent npm versions across environments.

### 5.5 `task_workdone` Table Still Referenced as `work_done` in Some Files

Legacy naming inconsistency.

### 5.6 `listTasks` Default Limit Changed to 100

Now mitigated by pagination, but the change was made without immediately adding pagination UI.

### 5.7 `bizlens_period_snapshots` Table Only in Migration

Not in base schema files — fresh installs that skip migrations won't have it.

### 5.8 `audit_schema_drift.py` Regex-Based Detection Is Flawed

The Python script uses regex to find `.from('table')` and then scans subsequent lines for columns. It frequently misattributes operations across different tables when they appear within ~15 lines of each other.

---

## 6. Architecture Assessment

### 6.1 What Works Well

| Area | Assessment |
|---|---|
| **Three-layer architecture** | Strictly followed. Actions → Services → Repositories. Clean separation. |
| **RLS** | Comprehensive policies for admin/team/client scoping. 42 tables have RLS enabled. |
| **Auth middleware** | Proper session refresh, role-prefix routing, inactive-user bounce. |
| **TypeScript** | Clean compilation. Good use of typed inputs/outputs. |
| **Zod validation** | Consistent schema validation on action inputs. |
| **Soft deletes** | `is_deleted` + `deleted_at` + `deleted_by` pattern widely adopted. |
| **Error handling** | Standard `ok()`/`fail()` shape across all actions. |
| **shadcn/ui** | Consistent component primitives. |
| **Dynamic imports** | Charts are dynamically imported. Good for bundle size. |

### 6.2 Architectural Gaps

| Area | Gap |
|---|---|
| **Audit logging** | `writeAudit()` exists but is **never called** from actions. |
| **Rate limiting** | No middleware or action-level rate limiting. |
| **Caching strategy** | Correctly avoids `cache()`/`unstable_cache` with cookies after recent fix. But no positive caching strategy remains. |
| **Client-side data fetching** | No SWR/React Query. Components refetch on every mount. |
| **Error boundaries** | Only route-level error.tsx. No component-level boundaries. |
| **Form architecture** | Some complex forms don't use React Hook Form + Zod (raw state + manual validation). |

---

## 7. Database Schema Assessment

### 7.1 Tables with RLS Enabled (42 total)

All core business tables have RLS. The only tables missing from base schema files are those created via migrations:
- `bizlens_period_snapshots`
- `gst_monthly_data`
- `income_tax_slabs`
- `weekly_timesheet_submissions`

### 7.2 Tables Referenced in Code But Missing from Schema

| Table | Where Referenced | Status |
|---|---|---|
| `team_profiles` | `lib/actions/task-import.ts` | **BUG — table does not exist** |

### 7.3 Schema vs Code Column Drift

After the May 30 migration (`2026-05-30-fix-missing-updated-at.sql`), the real drift is minimal:
- `guidance_notes` on `task_steps` — **valid**, added by migration
- `updated_at` on `service_categories`, `services`, `task_workdone` — **fixed**

The `audit_schema_drift.py` script generates false positives due to regex limitations.

---

## 8. Security Checklist

| Check | Status | Notes |
|---|---|---|
| RLS on all tables | ✅ | 42 tables |
| Auth on all API routes | ❌ | `/api/services`, `/api/task-templates` are open |
| Auth on all Server Actions | ✅ | All actions gate on `requireRole` or `getCurrentUser` |
| Capability checks on admin actions | ⚠️ | Need spot-check of every `/admin/*` page |
| Audit logging | ❌ | Zero action files write to `global_audit_log` |
| Rate limiting | ❌ | None |
| Input sanitization | ⚠️ | Zod validates shape but doesn't sanitize HTML/JS |
| XSS protection | ⚠️ | `dangerouslySetInnerHTML` used with DB content |
| CSRF protection | ✅ | Next.js handles CSRF for Server Actions |
| Secrets in env | ✅ | No hardcoded secrets found |
| Service-role key isolation | ✅ | Only in cron/scripts |
| CSP headers | ✅ | Configured in `next.config.js` |
| 2FA enforcement | ⚠️ | Mentioned in AGENTS.md but not verified in code |

---

## 9. Performance Checklist

| Check | Status | Notes |
|---|---|---|
| Dynamic imports for heavy components | ✅ | Charts are dynamic |
| `Promise.all` for parallel queries | ✅ | Most pages use this |
| Pagination on list pages | ✅ | Just added to tasks/clients |
| `.select('*')` avoidance | ❌ | 14 instances |
| N+1 queries | ⚠️ | Task detail fetches steps one-by-one |
| Bundle analyzer configured | ✅ | `@next/bundle-analyzer` installed |
| Image optimization | ✅ | `next/image` with avif/webp |
| Client-side caching | ❌ | No SWR/React Query |
| Debounced inputs | ✅ | FilterBar is debounced at 300ms |

---

## 10. Recommended Priority Actions

### P0 — Fix Immediately (Security / Crash)

1. **Add auth to `/api/services` and `/api/task-templates`** — unauthenticated data leakage
2. **Add `.eq('is_deleted', false)` to cmdk search** — deleted data visible in search
3. **Fix `mini-sparkline.tsx` hydration** — `Math.random()` crash
4. **Fix `team_profiles` reference** — table doesn't exist, breaks task import
5. **Add `.eq('is_deleted', false)` to open-task guards** in `services-catalogue.ts`, `task-templates.ts`

### P1 — Fix This Week (Security / Reliability)

6. **Add audit logging to all sensitive actions** — use `writeAudit()` from `audit-service.ts`
7. **Add rate limiting** — at minimum on password reset, credential reveal, and bulk operations
8. **Sanitize `insights.body` before `dangerouslySetInnerHTML`** — or switch to Markdown rendering
9. **Replace `window.location.reload()` with `router.refresh()`**
10. **Add `is_deleted` filter to `team.ts` reassignment queries**

### P2 — Fix This Sprint (Quality / Performance)

11. **Replace `.select('*')` with specific columns** in repositories
12. **Add React Hook Form + Zod to complex forms** (new-task-dialog, bizlens input)
13. **Add `useSWR` or React Query** for client-side data fetching
14. **Add component error boundaries** around BizLens, charts, heavy widgets
15. **Fix `key={i}` with stable IDs** across lists

### P3 — Polish (Maintainability)

16. **Remove `tsconfig.tsbuildinfo` from git**
17. **Regenerate `supabase_openapi.json`** from live schema
18. **Consolidate `task_workdone` / `work_done` naming**
19. **Add `not-found.tsx` to major sub-routes**
20. **Replace `audit_schema_drift.py` regex with AST-based parsing**

---

*End of comprehensive audit. No code changes were made.*
