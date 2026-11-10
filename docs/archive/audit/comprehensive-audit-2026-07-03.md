# Comprehensive Codebase Audit — The Fiscal Fulcrum Portal

**Date:** 2026-07-03  
**Scope:** Full stack — routes, screens, database, RLS, security, performance, features, DX  
**Auditor:** Kimi Code CLI  
**Build status:** ✅ `npm run build` passes  
**Tests:** ✅ All unit tests pass  
**Dirty working files:** 4 (`app/portal/tasks/portal-tasks-table.tsx`, `components/clients/client-hover-card.tsx`, `components/notices/notice-hover-card.tsx`, `components/tasks/task-hover-card.tsx`)

---

## Executive Summary

The Fiscal Fulcrum Portal is a functionally rich, single-tenant Next.js 14 + Supabase practice-management system. The recent UX Revolution sprint fixed the P0 build/runtime blockers, and the core operational loops (clients, tasks, notices, queries, payroll, attendance, BizLens) are in production shape.

However, **four categories of issues block a true 100x transformation**:

1. **Security & RLS drift** — broken audit logging, service-role misuse in user paths, PostgREST injection vectors, and stale consolidated schema files.
2. **Missing product modules** — the document vault is entirely absent despite buckets/schema; TDS/IT filing entry UI is missing.
3. **Performance & bundle bloat** — 4.52 MB of static JS, 315 KB First Load JS on `/admin/compliance`, 216 client components, and almost no `Suspense` boundaries.
4. **Code-quality debt** — 1,080+ `any` casts, duplicated admin/team page pairs, dead files, and weak test coverage for critical services.

### Severity Summary

| Severity | Count |
|---|---|
| 🔴 Critical (P0) | 9 |
| 🟠 High (P1) | 18 |
| 🟡 Medium (P2) | 28 |
| 🟢 Low (P3) | 16 |

---

## 🔴 P0 — Critical (Fix Before Scaling)

### P0.1 — Audit logging is silently broken
- **Files:** `db/rls-2026-05-14-close-gaps.sql:27-31`, `lib/services/audit-service.ts:16`
- **Issue:** `global_audit_log` has no authenticated INSERT policy. `writeAudit()` defaults to the regular server client, and **zero** of the 53 `writeAudit()` callers pass `serviceRole: true`.
- **Impact:** Every security-sensitive action claims to log but actually fails silently. Compliance/DPDP/forensics are compromised.
- **Fix:** Add `CREATE POLICY audit_auth_insert ON global_audit_log FOR INSERT TO authenticated WITH CHECK (performed_by = auth.uid());` OR default `writeAudit()` to `createServiceClient()`.

### P0.2 — PostgREST filter injection in search
- **Files:** `lib/repositories/tasks.ts:120-123`, `lib/repositories/tasks.ts:221-224`, `lib/repositories/clients.ts:27`, `lib/repositories/clients.ts:56`, `app/api/cmdk/search/route.ts:28-58`
- **Issue:** User search terms are interpolated directly into `.or("...")` strings. Characters like `,`, `(`, `)`, `:*` can alter filter logic.
- **Impact:** Data exfiltration / unauthorized reads if RLS is ever misconfigured.
- **Fix:** Escape/remove PostgREST operators, or use parameterized `.ilike()` + `.in()` with whitelisted IDs.

### P0.3 — `refresh-compliance-events` cron trusts `User-Agent`
- **File:** `app/api/cron/refresh-compliance-events/route.ts:14-17`
- **Issue:** Accepts `User-Agent: vercel-cron` as sole auth signal. `User-Agent` is trivially spoofed.
- **Impact:** Anyone can trigger compliance event refreshes and pollute data.
- **Fix:** Remove `User-Agent` branch; require `CRON_SECRET` query param or `x-vercel-cron` header (used by all other cron routes).

### P0.4 — Document vault is missing despite schema & buckets
- **Files:** `scripts/create-buckets.ts`, `db/schema.sql` (`documents`, `document_requests`, etc.), `db/migrations/2026-06-13-drop-dead-tables.sql`
- **Issue:** Storage buckets exist, tables exist (or existed), but **zero** application routes/components/actions implement document upload/download/request.
- **Impact:** A CA/CS practice cannot share files, collect signed engagement letters, or run a client portal without documents.
- **Fix:** Build `/admin/documents`, `/team/documents`, `/portal/documents` with RLS, virus-size checks, and portal visibility.

### P0.5 — `all_schema.sql` / `full_schema.sql` are broken
- **Files:** `all_schema.sql:3034`, `full_schema.sql:3753`
- **Issue:** `v_unified_inbox` references `n.authority` but the `notices` column is `issuing_authority`; also uses removed `awaiting_client` status.
- **Impact:** Fresh installs from consolidated files fail. New developers/onboarding break.
- **Fix:** Regenerate from a clean migration baseline or delete and rely on ordered migrations only.

### P0.6 — Service-role client used in routine user-facing writes
- **Files:** `lib/services/notification-service.ts:30`, `lib/services/solution-log-service.ts:30`, `lib/services/client-service.ts:41`
- **Issue:** Notifications and solution-log writes bypass RLS. `client-service` inserts `users_profile`/`client_users` via service role.
- **Impact:** Privilege escalation, missing audit trail, inconsistent access control.
- **Fix:** Add proper RLS INSERT policies and use the regular server client. Reserve service-role for Supabase Auth admin API and cron.

### P0.7 — Admin layout blocks team, but admin pages still check `['admin','team']`
- **Files:** `app/admin/layout.tsx:8`, `app/admin/clients/page.tsx`, `app/admin/tasks/page.tsx`, `app/admin/reports/*/page.tsx`, etc.
- **Issue:** `requireRole('admin')` in layout makes every `['admin','team']` + capability check inside `/admin/*` unreachable dead code.
- **Impact:** Misleading security posture, duplicated pages, maintenance risk.
- **Fix:** Merge admin/team page pairs into shared components parameterized by `rolePrefix` and capability set, or split responsibilities cleanly.

### P0.8 — Portal module visibility bypass on sub-routes
- **Files:** `app/portal/bizlens/[reportId]/page.tsx`, `app/portal/vcfo/solution-log/page.tsx`
- **Issue:** These pages call `requireRole('client')` but never call `ensureModuleVisible(...)`.
- **Impact:** Direct URL access bypasses admin portal-visibility toggles.
- **Fix:** Add `ensureModuleVisible('portal.bizlens')` / `ensureModuleVisible('portal.vcfo')`.

### P0.9 — Missing `/logo.svg` breaks every marketing page
- **Files:** `components/site/Navbar.js:48`, `components/site/Footer.js:19`
- **Issue:** `public/logo.svg` does not exist; only `public/logo.png` exists.
- **Impact:** 404 on every marketing page header/footer, hurts LCP/brand.
- **Fix:** Add `public/logo.svg` or update references to `logo.png`.

---

## 🟠 P1 — High (Functional / Security / Scale)

### P1.1 — TDS / Income Tax filing entry UI missing
- **Evidence:** Only GST has dedicated data-entry pages (`/admin/gst`, `/team/gst`). `tds_filings`, `it_filings` tables exist but no UI.
- **Fix:** Add `/admin/tds`, `/admin/it`, `/team/tds`, `/team/it` mirroring GST monthly-data flow.

### P1.2 — API preview routes skip capability checks
- **Files:** `app/api/clients/[id]/preview/route.ts`, `app/api/notices/[id]/preview/route.ts`, `app/api/tasks/[id]/preview/route.ts`
- **Issue:** Only session auth required; any logged-in user (including `client`) can fetch previews.
- **Fix:** Add `requireCapability` gates matching the parent module.

### P1.3 — `/api/cmdk/search` leaks credentials without capability check
- **File:** `app/api/cmdk/search/route.ts:55-60`
- **Issue:** Returns credentials rows for any admin/team user regardless of `credentials.view`.
- **Fix:** Gate credentials section on `credentials.view` capability.

### P1.4 — CSV export vulnerable to formula injection
- **Files:** `lib/actions/export.ts:19-25`, `components/sophistication/export-button.tsx:63-78`
- **Issue:** Cells starting with `=`, `+`, `-`, `@` are not sanitized.
- **Fix:** Prefix formula characters with tab/single quote.

### P1.5 — File imports lack type/magic-byte validation
- **Files:** `lib/actions/task-import.ts:28-31`, `lib/actions/client-import.ts:31-34`
- **Issue:** Only size checked; malicious spreadsheets could exploit `xlsx` parser.
- **Fix:** Whitelist MIME/extension, scan magic bytes, cap rows.

### P1.6 — Super-admin page hardcodes identities and returns plaintext passwords
- **Files:** `app/admin/super-admins/page.tsx:11-14`, `lib/actions/super-admin.ts:39-92`
- **Issue:** Emails/names baked into source; action returns `ok({ password, email })`.
- **Fix:** Move identities to DB/env; do not return plaintext passwords in action results.

### P1.7 — `schema-v3-4.sql` view depends on column added later
- **File:** `db/schema-v3-4.sql:277` vs `db/migrations/2026-06-01-add-missing-is-deleted-columns.sql`
- **Issue:** `v_unified_inbox` filters `compliance_calendar_events.is_deleted = false` before that column exists in canonical order.
- **Fix:** Reorder migrations or make `schema-v3-4.sql` idempotent.

### P1.8 — `schema-additions.sql` references removed `awaiting_client` status
- **File:** `db/schema-additions.sql:365`
- **Issue:** `task_steps_client_read` policy uses `status.eq.awaiting_client` which no longer exists.
- **Fix:** Update to `in_progress` + `is_blocked_on_client = true`.

### P1.9 — Heavy admin/team page duplication
- **Evidence:** `app/admin/tasks/page.tsx` ↔ `app/team/tasks/page.tsx`; same for clients, reports, settings, queries, notices, hearings, gst, work-done.
- **Fix:** Merge into shared pages/components with `rolePrefix` and capability props.

### P1.10 — Bundle bloat: xlsx lands in client chunk
- **File:** `components/sophistication/export-button.tsx` (dynamic import), `.next/static/chunks/2170a4aa.*.js` (~404 KB)
- **Issue:** `xlsx` appears in static client bundle despite dynamic import.
- **Fix:** Move export generation to a Server Action and serve a download link; remove `xlsx` from client path.

### P1.11 — `/admin/compliance` loads 315 KB First Load JS
- **File:** `app/admin/compliance/page.tsx`
- **Issue:** Pulls ECharts + export button + 1000-row in-memory aggregation.
- **Fix:** Lazy-load charts, paginate aggregates, add Suspense boundaries.

### P1.12 — Soft delete missing on financial tables
- **Tables:** `bizlens_data`, `bizlens_period_snapshots`, `gst_monthly_data`, `vcfo_snapshots`, `financial_data`
- **Impact:** Accidental deletion is permanent.
- **Fix:** Add `is_deleted`/`deleted_at`/`deleted_by` and update repositories.

### P1.13 — Many foreign keys lack `ON DELETE` actions
- **Examples:** `tasks.client_id`, `tasks.sub_service_id`, `hearings.notice_id`, `queries.task_id`, `client_services.service_id`
- **Impact:** Hard deletes cascade-fail or leave orphans.
- **Fix:** Add `ON DELETE CASCADE` / `SET NULL` or enforce soft-delete-only parent deletion.

### P1.14 — Missing unique/check constraints
- **Examples:** `clients.gstin` length, `clients.pan` length, `payroll_runs.year` range, `leave_requests.to_date >= from_date`.
- **Fix:** Add CHECK constraints and partial unique indexes.

### P1.15 — Unbounded dashboard queries
- **Files:** `app/admin/work/page.tsx:71-73` (`limit: 200`), `app/admin/compliance/page.tsx:34` (`limit: 1000`)
- **Impact:** Stats silently wrong or slow at scale.
- **Fix:** Use count queries and server-side aggregation.

### P1.16 — Action layer violates three-layer architecture
- **Files:** `lib/actions/tasks.ts`, `lib/actions/notices.ts`, `lib/actions/queries.ts`, `lib/actions/services.ts`, `lib/actions/attendance.ts`, `lib/actions/work-done.ts`
- **Issue:** Actions query tables directly instead of calling repositories/services.
- **Fix:** Refactor direct DB calls into repositories.

### P1.17 — `insight-service.ts` Rule 5 is a tautology/placeholder
- **File:** `lib/services/insight-service.ts`
- **Issue:** Rule reads from `compliance_insights` table it is supposed to populate.
- **Fix:** Implement real advance-tax adequacy rule or remove.

### P1.18 — Invoice generation / payment tracking missing
- **Evidence:** Billing only marks tasks as billed; no invoices, ledger, or payment status.
- **Fix:** Build invoice PDF generation, payment recording, and accounts receivable aging.

---

## 🟡 P2 — Medium (Architecture / Consistency / DX)

### P2.1 — Duplicate/conflicting global CSS files
- **Files:** `app/globals.css`, `appglobals.css`
- **Issue:** Both exist with divergent base tokens (`14px` vs `16px`, `#FAFAFA` vs `#FFFFFF`).
- **Fix:** Delete `appglobals.css` and consolidate.

### P2.2 — 1,080+ `any` casts
- **Top offenders:** `lib/actions/tasks.ts` (49), `components/tasks/task-detail-shell.tsx` (41), `components/clients/client-detail-shell.tsx` (26)
- **Fix:** Type repository payloads, replace casts, enable `@typescript-eslint/no-explicit-any`.

### P2.3 — Test coverage thin for critical services
- **Missing tests:** `task-service`, `payroll-compute`, `insight-service`, `client-import-service`, `task-import-service`, `tax-projection`, `solution-log-service`, `dashboard-service`, `compliance-score`.
- **Fix:** Add unit tests for pure business-logic functions.

### P2.4 — Dead / unused files
- **Files:** `app/admin/clients/[id]/client-activity-stream.tsx`, `components/clients/clients-list-shell.tsx`, `components/shell/context-rail.tsx`, `components/notices/notice-hover-card.tsx`, `app/team/approvals/review-week.tsx`
- **Fix:** Delete or wire up.

### P2.5 — `recharts` installed but unused
- **File:** `package.json`
- **Fix:** Remove from dependencies.

### P2.6 — Empty component folders documented as modules
- **Folders:** `components/engagements/`, `components/insights/`, `components/reports/`, `components/vcfo/`
- **Fix:** Remove empty folders or populate; update docs.

### P2.7 — Sequential DB queries in unified inbox
- **File:** `lib/repositories/unified-inbox.ts`
- **Fix:** Parallelize with `Promise.all`.

### P2.8 — Minimal ESLint rules
- **File:** `.eslintrc.json`
- **Issue:** Only `next/core-web-vitals` + two hooks rules. No a11y, no unused-vars, no TypeScript strictness.
- **Fix:** Add `@typescript-eslint` rules and `jsx-a11y`.

### P2.9 — Marketing insights/blog is a non-functional stub
- **Files:** `app/(marketing)/insights/page.tsx`, `app/(marketing)/insights/[slug]/page.tsx`, `components/site/InsightsClient.js`
- **Fix:** Implement CMS-driven blog or remove public links.

### P2.10 — Portal mobile bottom nav ignores enabled modules
- **File:** `components/shell/mobile-bottom-nav.tsx:8-13`
- **Issue:** Only Home/Work/Calendar/Queries tabs; missing BizLens, vCFO, Notices when enabled.
- **Fix:** Generate tabs from portal visibility config.

### P2.11 — `permission_requests.user_id` references `auth.users(id)`
- **File:** `db/schema-permission-requests.sql:4`
- **Issue:** Breaks project identity abstraction (everything else uses `users_profile(id)`).
- **Fix:** Migrate to `users_profile(id)`.

### P2.12 — Overlapping RLS policies for task notes/activity
- **File:** `db/rls-additive.sql:208-220`
- **Issue:** `task_activity_visible` / `task_notes_visible` allow any authenticated user to read all activity/notes.
- **Fix:** Scope to assigned clients / capabilities.

### P2.13 — `queries_team_all` grants DELETE without `queries.delete` capability
- **File:** `db/rls-capabilities.sql:232-247`
- **Fix:** Split DELETE into separate capability.

### P2.14 — `task_steps` hard-deleted
- **Issue:** Contradicts soft-delete convention.
- **Fix:** Accept as documented exception or add `is_deleted`.

### P2.15 — `next.config.js` allows localhost origins
- **File:** `next.config.js:78-91`
- **Fix:** Remove localhost from production config.

### P2.16 — CSP allows `unsafe-eval` / `unsafe-inline`
- **File:** `next.config.js:49-50`
- **Fix:** Move toward nonces/hashes in production.

### P2.17 — `bodySizeLimit: '10mb'` generous
- **File:** `next.config.js`
- **Fix:** Lower default; raise only on upload actions.

### P2.18 — Playwright installed but unused
- **File:** `package.json`
- **Fix:** Add E2E smoke tests or remove.

### P2.19 — Outdated dependencies
- **Examples:** `next@14.2.35`, `react@18.3.1`, `tailwindcss@3.4.19`, `@supabase/ssr@0.5.2`, `lucide-react@0.451.0`.
- **Fix:** Plan incremental upgrade to Next.js 15/16, React 19, Tailwind 4.

### P2.20 — Runtime-only deps in `dependencies`
- **Files:** `package.json` (`@types/ws`, `ws`)
- **Fix:** Move to `devDependencies`.

### P2.21 — Dashboard service likely sequential
- **File:** `lib/services/dashboard-service.ts`
- **Fix:** Audit and parallelize independent repository calls.

### P2.22 — `app/team/clients/[id]/vcfo` exists but no admin equivalent
- **File:** `app/team/clients/[id]/vcfo/page.tsx`
- **Fix:** Add `/admin/clients/[id]/vcfo`.

### P2.23 — `exportTableDataAction` accepts untrusted rows/headers
- **File:** `lib/actions/export.ts:10-35`
- **Fix:** Add Zod validation.

### P2.24 — `runPayrollAction` lacks input validation
- **File:** `lib/actions/payroll.ts:10-31`
- **Fix:** Add Zod schema.

### P2.25 — `reorderSopStepsAction` lacks UUID validation
- **File:** `lib/actions/services-catalogue.ts:238-264`
- **Fix:** Validate `ids_in_order` as UUID array.

### P2.26 — `getBizlensReports` allows any authenticated user
- **File:** `lib/actions/bizlens-actions.ts:42-49`
- **Fix:** Add explicit client ownership / capability check.

### P2.27 — Preview API routes return raw errors
- **Files:** `app/api/cron/*/route.ts`, several actions
- **Fix:** Return generic error messages to callers.

### P2.28 — Detail routes redirect to dock instead of rendering
- **Evidence:** `app/admin/tasks/[id]/page.tsx`, `app/team/tasks/[id]/page.tsx`, all `[id]` pages
- **Fix:** Accept as UX pattern but ensure deep links work.

---

## 🟢 P3 — Low (Polish / Hygiene)

### P3.1 — Marketing pricing/testimonials hardcoded
- **Files:** `components/site/PricingBuilder.js`, `components/site/Testimonials.js`
- **Fix:** Accept for marketing or move to CMS.

### P3.2 — Some tables use fixed `min-w-[800px]`
- **Evidence:** `app/admin/approvals/page.tsx:48`
- **Fix:** Use responsive column hiding.

### P3.3 — Redundant `requireRole` calls inside layout-gated pages
- **Files:** `app/portal/tasks/page.tsx`, `app/portal/queries/page.tsx`
- **Fix:** Remove redundant calls.

### P3.4 — `PricingBuilder` passes options via query string but `ContactForm` may not read them
- **File:** `components/site/PricingBuilder.js:322-327`
- **Fix:** Verify/query `ContactForm`.

### P3.5 — `legacy-bizlens` references remain in docs
- **Files:** `AGENTS.md`, `memory/PRD.md`, `.gitignore`, `tsconfig.json`
- **Fix:** Clean up references.

### P3.6 — Conflicting schema migration order
- **File:** `db/migrations/*`
- **Fix:** Document destructive migrations (`wipe-client-data`, `drop-dead-tables`) and require confirmation.

### P3.7 — Two parallel AES-GCM modules
- **Files:** `lib/crypto/credentials.ts`, `lib/services/encryption.ts`
- **Fix:** Consolidate into one module.

### P3.8 — `getCurrentUser()` casts DB row
- **File:** `lib/auth/require-role.ts:24-31`
- **Fix:** Validate shape with Zod instead of cast.

### P3.9 — `requireCapability` leaks missing capability label
- **File:** `lib/auth/require-capability.ts:26-29`
- **Fix:** Accept or return generic message.

### P3.10 — `/api/notifications/unread` returns 200 on 401
- **File:** `app/api/notifications/unread/route.ts:9`
- **Fix:** Return 401 for unauthenticated.

### P3.11 — `/api/clients/[id]/sub-services` relies only on RLS
- **File:** `app/api/clients/[id]/sub-services/route.ts`
- **Fix:** Add explicit client access check.

### P3.12 — Hardcoded marketing prices on service pages
- **Files:** `app/(marketing)/cbam/page.tsx`, `app/(marketing)/process-controls/page.tsx`, `app/(marketing)/virtual-cfo/page.tsx`
- **Fix:** Accept as marketing copy.

### P3.13 — `components/site/*.js` while rest is TS
- **Fix:** Migrate marketing components to TypeScript.

### P3.14 — Commented-out `pageIn` animation in `app/globals.css`
- **Fix:** Remove or enable intentionally.

### P3.15 — `app/admin/team/[id]/page.tsx` weak auth check
- **File:** `app/admin/team/[id]/page.tsx:11`
- **Fix:** Align with other admin detail pages.

### P3.16 — No partial unique index for prime admin
- **Fix:** Add `UNIQUE (is_prime_admin) WHERE is_prime_admin = TRUE`.

---

## 🚀 Transformation Roadmap — 100x Plan

### Phase 1: Security & Trust (Weeks 1-2)
1. Fix `global_audit_log` INSERT policy and verify every `writeAudit()` succeeds.
2. Sanitize all `.or()` PostgREST filter construction.
3. Harden `refresh-compliance-events` cron auth.
4. Remove/replace service-role usage in `notification-service`, `solution-log-service`, `client-service`.
5. Add capability checks to preview API routes and cmdk search.
6. Fix CSV formula injection and file upload validation.

### Phase 2: Schema Integrity (Week 2-3)
1. Regenerate or delete consolidated schema files.
2. Reconcile canonical schema with migration-only tables/columns.
3. Add missing `ON DELETE` actions, CHECK/UNIQUE constraints, and FK indexes.
4. Add soft-delete columns to financial tables.
5. Fix `schema-additions.sql` stale `awaiting_client` policy.

### Phase 3: Core Product Gaps (Weeks 3-5)
1. **Document vault** — upload, download, request, portal visibility, RLS.
2. **TDS / IT filing entry** pages mirroring GST.
3. **Invoice generation + payment tracking** in billing.
4. **DSC certificate file upload** to storage bucket.
5. **BizLens PDF export** to storage bucket.

### Phase 4: Performance & Scale (Weeks 4-6)
1. Remove `xlsx` from client bundle (move export to Server Action).
2. Add `Suspense` boundaries to all data-heavy routes.
3. Parallelize sequential DB queries (inbox, dashboard).
4. Replace in-memory aggregation with count/server aggregates.
5. Reduce client component count; move read-only shells to Server Components.
6. Run `ANALYZE=true npm run build` and attack top chunks.

### Phase 5: Code Quality & Velocity (Weeks 5-8)
1. Merge duplicated admin/team page pairs.
2. Add ESLint `@typescript-eslint/no-explicit-any` and `jsx-a11y`.
3. Replace top `any` offenders.
4. Add tests for all services in `lib/services/`.
5. Delete dead files and empty folders.
6. Upgrade to Next.js 15/16 + React 19 + Tailwind 4.

### Phase 6: UX Polish & Growth (Weeks 6-10)
1. Fix marketing logo and blog stubs.
2. Dynamic portal mobile bottom nav from visibility config.
3. View-as-client toggle on Client 360°.
4. Natural-language command center for tasks.
5. Pull-to-refresh / swipe actions on portal.
6. End-to-end email delivery verification.

---

## Appendix: Quick-Reference File Map

| Domain | Key Files |
|---|---|
| Routes | `app/admin/*`, `app/team/*`, `app/portal/*`, `app/(marketing)/*` |
| Layout gating | `app/admin/layout.tsx`, `app/team/layout.tsx`, `app/portal/layout.tsx` |
| Auth helpers | `lib/auth/require-role.ts`, `lib/auth/require-capability.ts`, `lib/supabase/middleware.ts` |
| Server Actions | `lib/actions/*.ts` |
| Services | `lib/services/*.ts` |
| Repositories | `lib/repositories/*.ts` |
| Schema | `db/schema.sql`, `db/schema-additions.sql`, `db/schema-v3-3.sql`, `db/schema-v3-4.sql`, `db/rls-additive.sql`, `db/rls-capabilities.sql` |
| Migrations | `db/migrations/*.sql` |
| Security headers | `next.config.js` |
| Tests | `__tests__/*.test.ts` |
| Build output | `.next/static/chunks/*`, `.next/server/app/*` |

---

*End of audit.*
