# Production Launch Plan — Complete Fix List

> Generated: 2026-06-02
> Goal: Complete production launch (not soft launch)

## Phase 0: Discovery ✅
- Build passes clean ✅
- TypeScript passes clean ✅
- All audits read and categorized

## Phase 1: P0 Critical Fixes (Security / Crash / Data Integrity)

### 1.1 Unauthenticated API Endpoints
- [ ] `app/api/services/route.ts` — add `requireRole(['admin','team'])`
- [ ] `app/api/task-templates/route.ts` — add `requireRole(['admin','team'])`

### 1.2 Missing `is_deleted` Filters
- [ ] `app/api/cmdk/search/route.ts` — add `.eq('is_deleted', false)` to tasks + notices
- [ ] `lib/actions/services-catalogue.ts` — add to open-task guards (lines 176, 194, 225, 253)
- [ ] `lib/actions/task-templates.ts` — add to open-task guards (lines 98, 145, 187)
- [ ] `lib/actions/task-flags.ts` — add `.eq('is_deleted', false)`
- [ ] `lib/actions/team.ts` — add `.eq('is_deleted', false)` to reassignment query

### 1.3 Missing `team_profiles` Table
- [ ] Check if table exists in schema
- [ ] If missing: either create migration or fix `task-import.ts` reference

### 1.4 Hydration Crashes
- [ ] `components/ui/mini-sparkline.tsx` — remove `Math.random()` from render path
- [ ] `app/portal/page.tsx` — fix `getGreeting()` SSR mismatch

### 1.5 XSS Vector
- [ ] `app/(marketing)/insights/[slug]/page.tsx` — sanitize before `dangerouslySetInnerHTML`

### 1.6 `cache()` + `cookies()` Verification
- [ ] Verify no `cache()` or `unstable_cache()` wraps `createClient()`
- [ ] Fix `lib/repositories/services.ts` if still cached
- [ ] Fix `lib/repositories/cache-wrappers.ts` if still cached
- [ ] Fix `lib/auth/require-role.ts` if `getCurrentUser` still cached

### 1.7 Git Hygiene
- [ ] Remove `tsconfig.tsbuildinfo` from git + add to `.gitignore`

### 1.8 Console Leaks
- [ ] `lib/actions/tasks.ts:582` — remove `clientId` from console.error

## Phase 2: P1 High Priority Fixes

### 2.1 Audit Logging
- [ ] Add `writeAudit()` calls to sensitive actions (client CRUD, task writes, credential decrypt, etc.)

### 2.2 Rate Limiting
- [ ] Add rate limiting to password reset, credential reveal, bulk operations

### 2.3 Reload Anti-Pattern
- [ ] Replace `window.location.reload()` with `router.refresh()` in error boundaries + team manager

### 2.4 ESLint
- [ ] Either install `eslint` or remove `.eslintrc.json`

### 2.5 Not Found Pages
- [ ] Add `not-found.tsx` to major sub-routes

## Phase 3: P2 Medium Priority Fixes

### 3.1 Repository Over-Fetching
- [ ] Replace `.select('*')` with specific columns in 14 repository functions

### 3.2 Stable Keys
- [ ] Fix `key={i}` to use stable IDs across lists

### 3.3 Error Boundaries
- [ ] Add component-level error boundaries around heavy widgets

## Phase 4: P3 Infrastructure & Compliance

### 4.1 Legal Pages
- [ ] Create `/legal/privacy` — Privacy Policy (DPDP-aligned)
- [ ] Create `/legal/terms` — Terms of Service
- [ ] Create `/legal/sla` — Service Level Agreement
- [ ] Link from app footer

### 4.2 DPDP Audit Evidence
- [ ] Create `audit/day-31-evidence.md` template
- [ ] Document all 10 test pass criteria

### 4.3 Schema Completeness
- [ ] Ensure `bizlens_period_snapshots`, `gst_monthly_data`, `income_tax_slabs`, `weekly_timesheet_submissions` are in base schema or migrations

### 4.4 Production Hardening Checklist
- [ ] Update `audit/production-hardening.md` with current status
