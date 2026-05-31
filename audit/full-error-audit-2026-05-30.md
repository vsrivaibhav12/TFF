# Full Error Audit — The Fiscal Fulcrum Portal

> Date: 2026-05-30  
> Auditor: AI Agent  
> Scope: Runtime errors, schema drift, build issues, security surface

---

## 🚨 CRITICAL: cache() + cookies = Runtime 500 Errors

### Root Cause

React `cache()` (and Next.js `unstable_cache()`) memoizes function results. When the cached function calls `createClient()` from `@/lib/supabase/server`, it invokes `cookies()` from `next/headers` — a **dynamic data source** tied to the request. Next.js throws:

```
Error: Route used "cookies" inside a function cached with "cache(...)".
Accessing Dynamic data sources inside a cache scope is not supported.
```

### Affected Files (ALL introduced or worsened by recent changes)

| File | Line | Cached Function | Calls `createClient()`? | Impact |
|---|---|---|---|---|
| `lib/repositories/services.ts` | 76 | `listServicesCached` | ✅ Yes | **Breaks `/admin/services`** |
| `lib/repositories/services.ts` | 78 | `listSubServicesCached` | ✅ Yes | **Breaks `/admin/tasks`, `/team/tasks`** |
| `lib/repositories/services.ts` | 80 | `listServiceCategoriesCached` | ✅ Yes | **Breaks `/admin/services`** |
| `lib/repositories/cache-wrappers.ts` | 13 | `getTaskCached` | ✅ Yes | **Breaks `/team/tasks/[id]`, `/admin/tasks/[id]`** |
| `lib/repositories/cache-wrappers.ts` | 14 | `getClientByIdCached` | ✅ Yes | **Breaks `/admin/clients/[id]`** |
| `lib/repositories/cache-wrappers.ts` | 15 | `getTaskStepsCached` | ✅ Yes | **Breaks task detail pages** |
| `lib/repositories/cache-wrappers.ts` | 16 | `listTaskActivityCached` | ✅ Yes | **Breaks task detail pages** |
| `lib/repositories/cache-wrappers.ts` | 17 | `listTaskNotesCached` | ✅ Yes | **Breaks task detail pages** |
| `lib/repositories/cache-wrappers.ts` | 18 | `listTaskStepsCached` | ✅ Yes | **Breaks task detail pages** |
| `lib/repositories/cache-wrappers.ts` | 19 | `getTaskStepCompletionCached` | ✅ Yes | **Breaks task detail pages** |
| `lib/auth/require-role.ts` | 18 | `getCurrentUser` | ✅ Yes | **Potentially breaks ALL authenticated pages** |

### Evidence from Logs

```
Route /admin/tasks used "cookies" inside a function cached with "unstable_cache(...)".
  at createClient (./lib/supabase/server.ts:14:78)
  at listSubServices (./lib/repositories/services.ts:34:82)
  at listSubServicesCached.revalidate (./lib/repositories/services.ts:78:109)

Route /admin/services used "cookies" inside a function cached with "unstable_cache(...)".
  at createClient (./lib/supabase/server.ts:14:78)
  at listServiceCategories (./lib/repositories/services.ts:22:82)
  at listServiceCategoriesCached.revalidate (./lib/repositories/services.ts:80:106)
```

### Why `require-role.ts` Might Be Working (For Now)

`lib/auth/require-role.ts` also wraps `getCurrentUser` in `cache()`, but it may work because:
- It's called early in the render, before any other cached functions
- Next.js may allow one level of cookie access inside `cache()` if it's the first call
- However, this is fragile and could break with Next.js updates

---

## ⚠️ HIGH: Schema Drift — False Positives vs Real Issues

### Real Issues (ALL FIXED via migration `2026-05-30-fix-missing-updated-at.sql`)

| Table | Missing Column | Used By | Status |
|---|---|---|---|
| `service_categories` | `updated_at` | `services-catalogue.ts:25` | ✅ Fixed |
| `services` | `updated_at` | `services-catalogue.ts:73` | ✅ Fixed |
| `task_workdone` | `updated_at` | `work-done.ts:190` | ✅ Fixed |

### False Positives (Script Regex Limitations)

The `audit_schema_drift.py` script uses regex to find `.from('table').update({...})` patterns. It frequently **misattributes columns to the wrong table** when:

1. A SELECT on table A is followed by an UPDATE on table B within ~15 lines
2. The script sees `from('tasks').select('id')` then later `.update({is_required: ...})` on `task_steps`, but attributes `is_required` to `tasks`

**All remaining drift flags are false positives** caused by this regex limitation:
- `services-catalogue.ts:176` — Updates `task_steps`, not `tasks`
- `services-catalogue.ts:253` — Updates `task_steps`, not `tasks`
- `task-steps.ts:93, 127` — `guidance_notes` on `task_steps` (not flagged in reality, script line numbers drifted)
- `task-templates.ts:98, 187` — Updates `task_steps`, not `tasks`

**Recommendation**: The drift script needs to use AST parsing or Supabase introspection instead of regex.

---

## ⚠️ MEDIUM: Potential Issues Found During Audit

### 1. Console Logging of Sensitive Data

| File | Line | Content | Risk |
|---|---|---|---|
| `lib/actions/tasks.ts` | 61 | `console.error('Failed to seed template steps', e)` | Low — server logs only |
| `lib/actions/tasks.ts` | 69 | `console.error('SOP seeding failed:', e)` | Low — server logs only |
| `lib/actions/tasks.ts` | 582 | `console.error('Bulk task creation failed for client', clientId, e)` | **Medium** — logs client IDs |
| `lib/actions/client-import.ts` | 144 | `console.warn('Failed to auto-create group:', name, groupErr.message)` | Low |
| `lib/services/compliance-calendar-engine.ts` | 351 | `console.error('[compliance-engine] ...', error.message)` | Low |
| `lib/services/solution-log-service.ts` | 49 | `console.error('[solution-log] failed to write entry', e)` | Low |

**None of these are exposed to the browser** — they are server-side logs. But client IDs in server logs could aid an attacker with log access.

### 2. Default `listTasks` Limit Changed to 100

In `lib/repositories/tasks.ts`, `listTasks` now has a default limit of 100:
```ts
const limit = opts.limit ?? 100;
```

**Impact**: If users were relying on seeing ALL tasks without pagination, they now see only 100. The `/team/tasks` and `/admin/tasks` pages don't have client-side pagination, so users may not realize tasks are hidden.

### 3. `db:apply-migration` Script Uses Management API

The migration script sends raw SQL to `api.supabase.com/v1/projects/{ref}/database/query`. This works for DDL but:
- Requires `SUPABASE_ACCESS_TOKEN` with project-level permissions
- Cannot be used for migrations that require `SUPERUSER` privileges
- Has a timeout that may fail for large migrations

### 4. Missing `supabase_openapi.json` Sync

The schema drift script reads from `supabase_openapi.json` which is **stale** (doesn't reflect the `updated_at` columns we just added). This causes false positives even for fixed issues.

---

## ✅ PASSING CHECKS

| Check | Status |
|---|---|
| TypeScript compilation (`npx tsc --noEmit`) | ✅ Clean |
| Unit tests (56 tests) | ✅ All pass |
| Next.js build | ✅ Completes (with runtime errors on cached routes) |
| ESLint (`npm run lint`) | Not run — no config present |

---

## 📊 Summary Table

| Severity | Count | Description |
|---|---|---|
| 🚨 Critical | 11 | `cache()` wrapping `createClient()` — breaks pages |
| ⚠️ High | 3 | Schema drift (real) — already fixed via migration |
| ⚠️ Medium | 4 | Console logs, default limit, migration script limits, stale OpenAPI |
| ℹ️ Low | ~35 | Schema drift false positives from regex script |

---

## 🔧 Recommended Fixes (Pending Your Approval)

### Fix 1: Remove `cache()` from all repository functions (CRITICAL)

**Option A**: Remove `cache()` entirely from `services.ts` and `cache-wrappers.ts`
- Simplest, safest
- Reverts to original behavior
- No performance regression (pages already use `Promise.all`)

**Option B**: Keep `cache()` but pass Supabase client as argument
- Refactor all cached functions to accept `sb: SupabaseClient` parameter
- Call `createClient()` once per page, pass it down
- More invasive but preserves deduplication

**Option C**: Remove `cache()` only from functions used in `force-dynamic` pages
- Keep `cache()` for pages that don't read cookies (rare in this app)
- Partial fix, leaves landmines for future

### Fix 2: Add pagination UI to task list pages (MEDIUM)

Since `listTasks` now defaults to 100 rows, add server-side pagination to `/team/tasks` and `/admin/tasks` similar to `/admin/clients`.

### Fix 3: Clean up console logs (LOW)

Replace `console.error` in `lib/actions/tasks.ts:582` with a generic message that doesn't include `clientId`.

### Fix 4: Regenerate `supabase_openapi.json` (LOW)

Run `npx supabase gen types typescript --project-id <ref> > supabase_openapi.json` or equivalent to sync the schema file.

---

*End of audit. Waiting for your go-ahead to implement fixes.*
