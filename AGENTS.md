<!-- AGENTS.md — The Fiscal Fulcrum Portal -->
# AGENTS.md — The Fiscal Fulcrum Portal

> This file is written for AI coding agents. It assumes you know nothing about the project. Read this first before modifying any code.

---

## Project Overview

**The Fiscal Fulcrum (TFF)** is a single-tenant operations portal for an Indian CA/CS practice based in Coimbatore. It is **not** a multi-tenant SaaS — it serves one firm and that firm's clients.

The portal is used by firm staff only:
- **admin** — firm owners; full access and every capability implicitly.
- **team** — staff members; access scoped by client assignment + capability grants.

The `client` role was removed (database constraint is admin/team only; the client portal, the client portal, BizLens, vCFO, notices, hearings, queries, payroll, GST/TDS/IT filings, tax projections, insights and saved views were removed in Nov 2026 because they were never used; restore from git history if needed).

Key functional modules: client management, task engine (with checklists), compliance calendar, document vault, credentials vault, DSC tracker, attendance/leave/approvals, work-done tracking, billing entities, reports, unified inbox.

Production target: `https://portal.fiscalfulcrum.in` deployed on Vercel (function region `icn1`, next to the Supabase database in ap-northeast-2).

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS 3 |
| UI Components | shadcn/ui (Radix UI primitives) |
| Icons | Lucide React |
| Font | Inter (via `next/font/google`) |
| Backend / Auth / DB | Supabase (Postgres + Auth + Storage + RLS) |
| Validation | Zod |
| Forms | React Hook Form + `@hookform/resolvers` |
| Email | Resend |
| Charts | Recharts, ECharts |
| Tables | `@tanstack/react-table` + `@tanstack/react-virtual` |
| Drag-and-drop | `@dnd-kit/*` |
| Toast | Sonner |
| Test Runner | Node.js native test runner (`node:test`) with `tsx` |

ESLint is configured via `.eslintrc.json` extending `next/core-web-vitals`. No Prettier configuration is present.

---

## Project Structure

```
/app                 # Next.js App Router
  /(marketing)       # Public marketing pages: /, /about, /cbam, /compliance, /contact,
                     # /insights, /pricing, /process-controls, /virtual-cfo
  /account           # Self-service pages (notifications preferences, etc.)
  /admin             # Admin panel (role-gated, full nav)
  /api               # API routes (cron, cmdk search, notifications, services, etc.)
    /cron            # Vercel Cron endpoints
  /legal             # Static legal pages (privacy, terms, SLA, engagement)
  /login             # Sign-in page (+ forgot password)
  /team              # Team workspace (role-gated, desktop-first)
  globals.css        # Tailwind directives + CSS variables
  layout.tsx         # Root layout (Inter font, Sonner Toaster, SWR + Dock providers)
  page.tsx           # Role-based redirect hub or marketing home

/components          # React components by domain
  /billing           # Billing and invoice components
  /charts            # Reusable chart wrappers
  /clients           # Client forms, tables, hover cards
  /credentials       # Credentials vault UI
  /dashboard         # Admin/team dashboard widgets
  /dsc               # DSC tracker
  /inbox             # Unified inbox components
  /motion            # Framer Motion wrappers
  /operations        # Compliance calendar, BizLens input form, vCFO
  /reports           # Report pages
  /services          # Service catalogue
  /settings          # Settings forms
  /shell             # AppShell, command palette, notifications bell, dock, mobile nav
  /site              # Marketing site components
  /sophistication    # Saved views, bulk actions, audit timeline, editable cells
  /tasks             # Task dialogs, steps panel, work-done panel, Kanban
  /team              # Team-specific components
  /ui                # shadcn/ui primitives (Button, Card, Dialog, etc.)

/lib                 # All server-side logic lives here
  /actions           # Server Actions — thin wrappers over services
  /auth              # Auth helpers (requireRole, requireCapability, portal visibility, nav gating)
  /crypto            # AES-256-GCM encrypt/decrypt for credentials vault
  /email             # Resend client and send helpers
  /hooks             # Shared React hooks (auto-save, cmdk, keyboard shortcuts, etc.)
  /repositories      # DB access only — no business logic
  /services          # Business logic — testable, no HTTP
  /state             # Global React context state (dock, recent items)
  /supabase          # Supabase clients (server, service-role, middleware)
  /validation        # Zod schemas
  /utils.ts          # cn() helper, INR currency formatter, IST date helpers

/db                  # SQL schema and migrations
  schema.sql           # Base schema v3 (locked)
  schema-additions.sql # v3.1 additive tables (capabilities, portal visibility, notification prefs)
  schema-v3-3.sql      # Additional schema additions
  schema-v3-4.sql      # Further schema additions
  schema-hr-tables.sql # Attendance / leave / permission tables
  schema-unified-inbox.sql # Unified inbox view
  schema-weekly-approval.sql # Weekly approval tables
  rls-additive.sql     # Row Level Security policies
  rls-capabilities.sql # Capability-related RLS
  seed-compliance-rules.sql # Compliance rule seed data

/scripts             # TypeScript one-off scripts (seed, schema apply, migrations, RLS tests)


/memory              # Design docs and architecture decisions
  DESIGN_SYSTEM.md
  DPDP_AND_SECURITY.md
  NEXTJS_BACKEND_ARCHITECTURE.md
  GO_FORWARD_PLAN.md
  PRD.md
  archive/                     # Superseded audits, plans and notes (history only)

/__tests__           # Unit tests (Node native test runner)
```

---

## Build & Development Commands

All commands run from the project root.

```bash
# Install dependencies
npm install

# Dev server (Next.js on port 3000, listens 0.0.0.0)
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint
npm run lint


# Database scripts (all use tsx + dotenv)
npm run db:seed                      # Seed demo data
npm run db:seed-rollback             # Remove seeded demo data
npm run db:rls-test                  # Run RLS tests
npm run db:create-buckets            # Create Supabase Storage buckets
npm run db:seed-super-admins         # Seed super admin users
npm run db:apply-baseline            # Build a new database from the baseline schema
npm run db:apply-migration           # Apply a specific migration file
```

### Test commands

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Run a single test file
npm run test:one __tests__/periods.test.ts
```


---

## Code Style & Conventions

### Three-Layer Architecture (non-negotiable)

1. **Actions** (`lib/actions/*.ts`) — Server Actions. Gate on `requireRole` + `requireCapability`, validate with Zod, call services, return `ActionResult`.
2. **Services** (`lib/services/*.ts`) — Business logic. Take typed inputs, return typed outputs. No HTTP, no `revalidatePath`.
3. **Repositories** (`lib/repositories/*.ts`) — DB access only. Just CRUD against Supabase. No logic.

**Rules:**
- Actions never touch the database directly.
- Services never touch HTTP.
- Repositories never contain logic.

### Server Action Pattern

```ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import * as someService from '@/lib/services/some-service';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

export async function doSomething(input: SomeInput): Promise<ActionResult<SomeOutput>> {
  const me = await requireRole(['admin', 'team']);
  await requireCapability(me, 'some.capability');
  // validate, call service, revalidatePath, return ok/fail
}
```

### Standard Return Shape

Every Server Action returns one of:
```ts
{ success: true; data: T }
{ success: false; error: string; code?: string }
```

Use `ok(data)` and `fail(message, code)` from `lib/actions/result.ts`.

### Error Handling

- Services throw `ServiceError(message, code)`.
- Actions catch and convert to the standard result shape.
- Never leak raw exceptions to the frontend.

### File Naming

- Server Actions: `kebab-case.ts` (e.g., `compliance-calendar.ts`)
- Services: `kebab-case-service.ts`
- Repositories: `kebab-case.ts`
- Components: `PascalCase.tsx`
- Pages: `page.tsx` or `[param]/page.tsx`
- API routes: `route.ts`

### Imports & Aliases

- Path alias `@/*` maps to `./*` (project root).
- Use `@/lib/...`, `@/components/...`, etc.

### React Patterns

- **Server Components** are the default. Use them for read-only page data.
- **Client Components** (`'use client'`) only when interactivity (state, effects, hooks) is needed.
- **Server Actions** (`'use server'`) for all writes triggered by UI.

### UI Conventions

- **Sentence case** everywhere: "Save changes", not "Save Changes".
- **No emojis** in UI strings.
- **No exclamation marks** in app copy (toasts are the exception, sparingly).
- **Active voice**: "Update task", not "Task will be updated".
- **shadcn/ui components** are the default for all primitives.
- **Cards**: `border border-zinc-200 rounded-xl`, no shadow by default.
- **Hover lift**: `hover:border-zinc-300 transition-colors`.
- **Drop shadows** allowed only on floating UI: modals, dropdowns, tooltips, command palette.

### Design System Quick Reference

```
Background:    white (#FFFFFF)
Surface:       zinc-50 (#FAFAFA)
Headings:      zinc-900 (#18181B)
Body text:     zinc-500 (#71717A)
Borders:       zinc-200 (#E4E4E7)
Accent:        teal-600 (#0D9488)
Accent hover:  teal-700 (#0F766E)
Success:       green-600 (#16A34A)
Warning:       yellow-600 (#CA8A04)
Error:         red-600 (#DC2626)
```

- Font: Inter only.
- Client portal: **mobile-first** (bottom-tab nav below 768px).
- Team / admin: **desktop-first** (side nav on desktop, hamburger on mobile).

---

## Authentication & Authorization

### Role Model

Two roles: `admin` and `team` (the `client` role was removed).

- `admin` implicitly holds every capability.
- `team` holds **no capabilities by default**; admin grants explicitly via role templates or per-user deviations.
- `client` has no workspace (sign-in disabled).

### Middleware (`middleware.ts`)

- Redirects logged-out users from `/team`, `/admin` to `/login`.
- Redirects logged-in users hitting `/login` to `/` (role-routed).
- Redirects users hitting a role-prefix that doesn't match their role to their home page.
- Neutral prefixes (`/account`, `/legal`, `/api/cmdk`, `/api/notifications`, `/api/sub-services`) bypass role checks.

### Auth Helpers

- `requireRole(allowedRoles)` — throws/redirects if user lacks role.
- `requireCapability(user, capability)` — throws `ServiceError('NO_CAPABILITY')` if user lacks capability.
- `getCurrentUser()` — returns `{ id, email, role, full_name, is_active, is_prime_admin }` or `null`.


---

## Database & Supabase

### Clients

- **Server client** (`lib/supabase/server.ts`) — cookie-aware, respects RLS. Use in Server Components, Server Actions, Route Handlers.
- **Service-role client** (`lib/supabase/service-role.ts`) — **bypasses RLS**. Use ONLY in cron endpoints, webhooks, and one-off scripts. Never in browser. Never in user-initiated request paths.
- **Middleware client** (`lib/supabase/middleware.ts`) — session refresh in Next.js middleware.

### Row Level Security (RLS)

RLS is the **primary access-control boundary**. Every new table gets RLS policies before it gets data. The application layer adds capability gates as defense-in-depth, but RLS is the real lock.

### Schema

- The full schema is `db/baseline/2026-11-11-baseline.sql` (generated from the live database). Older schema, RLS and migration files are in `db/archive` for history only.
- New changes: add a dated file to `db/migrations/` and apply it with `npm run db:apply-migration <file>`. See `db/README.md`.
- Access rules can be checked at any time with `npm run db:rls-test` (read-only, always rolls back).
- Rate limits are stored in the database (`rate_limit_counters` + `check_rate_limit()`), so they hold across Vercel instances. Use `rateLimitByUser()` from `lib/rate-limit.ts` (it is async).

### Key Patterns

- **Soft delete**: `is_deleted`, `deleted_at`, `deleted_by` on client-data tables.
- **Versioning**: `is_current` + `superseded_by` for GST/TDS/IT filings and financial data.
- **Audit log**: `global_audit_log` captures actor, timestamp, action, entity for sensitive writes.
- **Partial unique index** on tasks prevents duplicate generation at DB level.

---

## Periods, deadlines and migrations

- **Periods** are defined once in `lib/periods.ts`: none, monthly, quarterly, half-yearly, yearly (and `gst_frequency`, which resolves per client). Quarters are fiscal (Q1 = Apr-Jun). Every period has a canonical key (`2026-10`, `FY2026-27-Q2`, `FY2026-27-H1`, `FY2026-27`). Use `formatPeriodColumns()` to show one and `PeriodPicker` to choose one. Never add free month/quarter/year inputs. A sub-service declares its `period_type`; `createTaskAction` and `updateTaskAction` reject a period that does not fit it.
- **Deadlines**: a deadline is a sub-service plus a period plus a due date. The date comes from `compliance_deadlines` (a changed date), else the compliance rule linked to the sub-service, else the sub-service's own due day (`lib/services/deadline-due-date.ts`). Tasks for a deadline are created through the `create_deadline_tasks` database function so a delegate needs no wider access.
- **Delegation**: the `compliance.generate_tasks` capability (create tasks from deadlines). Only a super admin (`is_prime_admin`) can grant or revoke it (`lib/auth/capability-grant.ts`).
- **Completed tasks** can be corrected by admins only, for a fixed list of fields (`lib/services/task-modify-guard.ts`); every such edit is audited. Any new action that changes a task must call `canEditTaskFields`.
- **Compliance tracking** reads tasks, not calendar events. A sub-service marked `is_compliance` (Services screen) is a compliance item; the home panel and the Compliance page group its tasks by due date, however the tasks were created (`lib/repositories/compliance-tasks.ts`, `lib/services/compliance-progress.ts`). The old `compliance_calendar_events` table and its nightly refresh were retired and the table is empty. A few older helpers still read it (the compliance column on the clients list); do not build new features on it.
- **Migrations** are applied by hand with `npm run db:apply-migration`, in date order. Code that reads a new column fails until its migration is applied, so apply first, then deploy. Pending at the time of writing: `2026-11-15-revoke-anon-task-functions.sql` (stops signed-out visitors running four task functions). The task list's tab counts come from one database function, `task_tab_counts` (`2026-11-15-task-tab-counts.sql`); the code falls back to separate counts if it is missing.

## Data access rules (read before writing queries)

- **The API returns at most 1,000 rows per request and does not warn you.** Any list that can grow past 1,000 rows (clients, tasks, task steps, work-done, audit log, client_sub_services...) MUST be paged. Use `fetchAll()` from `lib/supabase/fetch-all.ts` (it adds a stable `ORDER BY id`), or `.range()` with an explicit order. A query with no `.limit()/.range()/fetchAll` is a bug on these tables.
- **Keep `.in('col', [...])` lists under about 200 ids** (use `chunkArray`). Long lists make the request URL too long.
- **Never trust a write that returns no error.** Row level security makes an `update` that matches no permitted row succeed with zero rows changed. Add `.select('id')` and check the result (see `toggleTaskStepAction`).
- **Roles come from the database profile** (`getCurrentUser()`), never from `user_metadata`, which users can edit.
- **Passwords**: one rule in `lib/auth/password-policy.ts` (10+ characters, letters and numbers).
- **Search terms**: use `wrapLike()` for `.ilike()` values; never interpolate user text into `.or()`.

---

## Testing

### Unit Tests

The project uses the **Node.js native test runner** (`node:test`) with `tsx` and a setup file that mocks `server-only` / `client-only` for non-Next.js contexts.

```bash
npm run test
npm run test:watch
npm run test:one __tests__/some-file.test.ts
```

Test setup: `__tests__/setup.js` (CommonJS entry) and `__tests__/setup.ts` (TypeScript source).

Current test coverage includes:
- `__tests__/periods.test.ts`, `task-period.test.ts`, `period-review.test.ts` — the period model: financial years, keys, formatting, validation, review.
- `__tests__/task-edit-guard.test.ts`, `task-action-guards.test.ts`, `field-diff.test.ts`, `task-edit-values.test.ts` — who may edit which task fields, and that every task-changing action applies the rule.
- `__tests__/deadline-due-date.test.ts`, `deadline-plan.test.ts`, `deadline-create.test.ts`, `deadline-helpers.test.ts` — compliance deadlines: due dates, which clients are ready, creation rules, nudge timing, workload split, super-admin-only capability.
- `__tests__/task-tiles.test.ts`, `task-filter-params.test.ts`, `home-metrics.test.ts` — tasks page tiles, URL filters and dashboard arithmetic.
- `__tests__/task-transitions.test.ts`, `task-control-guardrails.test.ts` — task status transitions and completion guardrails.
- `__tests__/compliance-calendar-engine.test.ts` — the compliance calendar rules engine.
- `__tests__/encryption.test.ts` — AES-256-GCM credentials vault encryption.
- `__tests__/validation-schemas.test.ts`, `utils.test.ts`, `result-helpers.test.ts`, `csv-utils.test.ts`, `safe-search.test.ts`, `security-helpers.test.ts`, `reports.test.ts`, `links.test.ts`, `ui-guards.test.ts`, `runtime-safety.test.ts`, `group-f-polish.test.ts` — helpers and source-level guards.
- `__tests__/db-smoke.test.ts` — **connects to the database in `.env.local`** and checks that every table the code reads exists. It fails until pending migrations are applied.

### RLS / Security Tests

Run `npm run db:rls-test` for automated RLS verification. There are also ten manual access-control tests defined in `memory/DPDP_AND_SECURITY.md` (Day-3 and Day-31 audit checklist).

### Adding Tests

When you add pure business logic in `lib/services/`, add corresponding tests in `__tests__/`. Mock repositories; test service behavior in isolation.

---

## Cron Jobs

Defined in `vercel.json`. All schedules are UTC.

| Path | Schedule (UTC) | Purpose |
|---|---|---|
| `/api/cron/deadline-nudges` | `0 3 * * *` | Remind admins and deadline-task delegates when a period has ended and a week before the due date, if clients still lack tasks (~08:30 IST). Creates nothing. |
| `/api/cron/due-alerts` | `30 3 * * *` | Daily task due-date email alerts (~09:00 IST) |
| `/api/cron/dsc-alerts` | `30 2 * * *` | Daily DSC expiry alerts (~08:00 IST) |
| `/api/cron/notification-digest` | `0 4 * * *` | Daily/weekly digest emails (~09:30 IST) |

Cron handlers:
- Must call `isAuthorizedCron(request)` from `lib/auth/cron-auth.ts` (checks `Authorization: Bearer $CRON_SECRET`; the `x-vercel-cron` header is spoofable and is NOT trusted; the secret is never accepted in the URL).
- Must use `createServiceClient()` (no user session).
- Must set `maxDuration = 60` (Vercel Pro limit).

---

## Environment Variables

Required in `.env.local` (and Vercel production):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # ⚠️ server only, never NEXT_PUBLIC_
SUPABASE_ACCESS_TOKEN=sbp_...
SUPABASE_PROJECT_REF=...

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@thefiscalfulcrum.com

# Crypto
CREDENTIALS_KEY=<base64 of exactly 32 random bytes>  # AES-256-GCM key. Generate: openssl rand -base64 32

# Cron
CRON_SECRET=<random string>               # Vercel Cron auth

# Seed
ADMIN_SEED_EMAIL=admin@example.com
```

**Critical rule**: Never prefix a secret with `NEXT_PUBLIC_`. That sends it to the browser.

---

## Security Considerations

1. **RLS first**: Every table has RLS policies. Do not disable RLS for testing.
2. **Capability gates**: Every Server Action gates on `requireRole` then `requireCapability`.
3. **Service-role key**: Only in cron/webhooks/scripts. Never in Client Components.
4. **Credentials vault**: AES-256-GCM encryption in application layer (not `pgcrypto`). Decrypt only in `credentials.manage`-gated actions.
5. **Audit log**: Every capability grant/revoke, portal visibility change, credential decrypt, soft-delete, and bulk action writes to `global_audit_log`.
6. **2FA**: Mandatory for `admin` and `team` in production Supabase.
7. **DPDP compliance**: See `memory/DPDP_AND_SECURITY.md` for the full ten-test audit checklist and breach-response guidance.
8. **Security headers**: `next.config.js` sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control`, and a strict `Content-Security-Policy`.

---

## Deployment

- **Production**: Vercel (linked to GitHub repo).
- **Domain**: `https://portal.fiscalfulcrum.in`.
- **Marketing site**: `https://fiscalfulcrum.in` served from the `app/(marketing)` route group on the same deployment.
- **Sign-out redirect**: Returns to `https://fiscalfulcrum.in/`.

---

## Where to Read More

- **Architecture deep-dive**: `memory/NEXTJS_BACKEND_ARCHITECTURE.md`
- **Design system + sophistication bar**: `memory/DESIGN_SYSTEM.md`
- **Security & DPDP**: `memory/DPDP_AND_SECURITY.md`
- **Active backlog**: `memory/GO_FORWARD_PLAN.md`
- **Workflows / UX rules**: `WORKFLOWS.md`
- **Schema**: `db/schema.sql` + `db/schema-additions.sql`
- **Historical reasoning**: `memory/PRD.md`; older audits, plans and notes are in `memory/archive/`
