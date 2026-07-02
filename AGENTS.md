<!-- AGENTS.md — The Fiscal Fulcrum Portal -->
# AGENTS.md — The Fiscal Fulcrum Portal

> This file is written for AI coding agents. It assumes you know nothing about the project. Read this first before modifying any code.

---

## Project Overview

**The Fiscal Fulcrum (TFF)** is a single-tenant operations portal for an Indian CA/CS practice based in Coimbatore. It is **not** a multi-tenant SaaS — it serves one firm and that firm's clients.

The portal supports three user roles:
- **admin** — firm owners; full access and every capability implicitly.
- **team** — staff members; access scoped by client assignment + capability grants.
- **client** — external business clients; access scoped to their own data + portal visibility settings.

Key functional modules: client management, task engine, compliance tracking (GST/TDS/IT), document vault, credentials vault, DSC tracker, payroll, attendance/leave, vCFO advisory, BizLens financial intelligence, notice tracker, query messenger, unified inbox, and insight engine.

Production target: `https://portal.fiscalfulcrum.in` deployed on Vercel.

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
| Dev Proxy | Node `proxy.js` (8001 → 3000) and `frontend-proxy.js` (3000 → 3001) |
| FastAPI Proxy | `backend/server.py` (8001 → 3001 by default, dev-only) |

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
  /portal            # Client portal (role-gated, mobile-first)
  /team              # Team workspace (role-gated, desktop-first)
  globals.css        # Tailwind directives + CSS variables
  layout.tsx         # Root layout (Inter font, Sonner Toaster, SWR + Dock providers)
  page.tsx           # Role-based redirect hub or marketing home

/components          # React components by domain
  /billing           # Billing and invoice components
  /bizlens           # BizLens output dashboard + tabs
  /charts            # Reusable chart wrappers
  /clients           # Client forms, tables, hover cards
  /credentials       # Credentials vault UI
  /dashboard         # Admin/team dashboard widgets
  /dsc               # DSC tracker
  /gst               # GST data entry and views
  /hearings          # Hearing management
  /inbox             # Unified inbox components
  /insights          # Inline insight strips
  /motion            # Framer Motion wrappers
  /notices           # Notice tracker
  /operations        # Compliance calendar, BizLens input form, vCFO
  /payroll           # Payroll UI
  /portal            # Client portal-specific components
  /queries           # Query messenger
  /reports           # Report pages
  /services          # Service catalogue
  /settings          # Settings forms
  /shell             # AppShell, command palette, notifications bell, dock, mobile nav
  /site              # Marketing site components
  /sophistication    # Saved views, bulk actions, audit timeline, editable cells
  /tasks             # Task dialogs, steps panel, work-done panel, Kanban
  /tax-projections   # Tax projection UI
  /team              # Team-specific components
  /ui                # shadcn/ui primitives (Button, Card, Dialog, etc.)
  /vcfo              # vCFO advisory UI

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
  schema-bizlens.sql   # BizLens tables
  schema-hr-tables.sql # Attendance / leave / permission tables
  schema-unified-inbox.sql # Unified inbox view
  schema-weekly-approval.sql # Weekly approval tables
  rls-additive.sql     # Row Level Security policies
  rls-capabilities.sql # Capability-related RLS
  seed-compliance-rules.sql # Compliance rule seed data

/scripts             # TypeScript one-off scripts (seed, schema apply, migrations, RLS tests)

/backend             # FastAPI dev proxy (forwards /api/* from port 8001 → 3001)
  server.py
  requirements.txt

/frontend            # Container shim only
  package.json       # Runs /app/frontend-proxy.js in Emergent/K8s dev environment

/legacy-bizlens      # Deprecated path; no longer present

/memory              # Design docs and architecture decisions
  DESIGN_SYSTEM.md
  DPDP_AND_SECURITY.md
  NEXTJS_BACKEND_ARCHITECTURE.md
  GO_FORWARD_PLAN.md
  PRD.md
  MIGRATION_NOTE.md

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

# Dev proxy (Emergent environment): forwards port 8001 → Next.js on 3000
npm run proxy

# Database scripts (all use tsx + dotenv)
npm run db:apply-schema              # Apply base schema
npm run db:apply-schema-additions    # Apply v3.1 additive schema
npm run db:apply-rls-capabilities    # Apply capability RLS
npm run db:apply-rls-additive        # Apply additive RLS (admin policies on clients, etc.)
npm run db:apply-performance-indexes # Apply performance index migration
npm run db:apply-phase-2             # Apply phase-2 task enhancements
npm run db:fix-missing-columns       # Apply missing column fixes
npm run db:seed                      # Seed demo data
npm run db:seed-rollback             # Remove seeded demo data
npm run db:rls-test                  # Run RLS tests
npm run db:create-buckets            # Create Supabase Storage buckets
npm run db:apply-weekly-approval     # Apply weekly approval schema
npm run db:apply-hr-tables           # Apply HR tables
npm run db:apply-task-indices        # Apply task indices
npm run db:apply-attendance-rls      # Apply attendance RLS
npm run db:apply-updated-at-migration # Apply updated_at triggers
npm run db:apply-unique-constraint-fix # Apply unique constraint fix
npm run db:wipe-client-data          # Wipe client data
npm run db:seed-super-admins         # Seed super admin users
npm run db:apply-migration           # Apply a specific migration
```

### Test commands

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Run a single test file
npm run test:one __tests__/bizlens-service.test.ts
```

### FastAPI dev proxy (alternative)

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001
```

The FastAPI proxy is **dev-only**. It forwards to `NEXT_TARGET` (default `http://127.0.0.1:3001`). Vercel handles production directly.

### Container dev proxies

Two Node proxies exist for the Emergent/K8s dev environment:

- `proxy.js` — listens on `0.0.0.0:8001`, forwards to `127.0.0.1:3000`. Run with `npm run proxy`.
- `frontend-proxy.js` — spawns Next.js dev on port 3001 and proxies `0.0.0.0:3000 → 127.0.0.1:3001`. Used inside a container where the ingress hits port 3000.

Both proxies manipulate `x-forwarded-host` / `host` headers so Next.js Server Actions CSRF checks pass through K8s ingress.

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

Three roles: `admin`, `team`, `client`.

- `admin` implicitly holds every capability.
- `team` holds **no capabilities by default**; admin grants explicitly via role templates or per-user deviations.
- `client` is scoped entirely by RLS + portal visibility.

### Middleware (`middleware.ts`)

- Redirects logged-out users from `/portal`, `/team`, `/admin` to `/login`.
- Redirects logged-in users hitting `/login` to `/` (role-routed).
- Redirects users hitting a role-prefix that doesn't match their role to their home page.
- Neutral prefixes (`/account`, `/legal`, `/api/cmdk`, `/api/notifications`, `/api/sub-services`) bypass role checks.

### Auth Helpers

- `requireRole(allowedRoles)` — throws/redirects if user lacks role.
- `requireCapability(user, capability)` — throws `ServiceError('NO_CAPABILITY')` if user lacks capability.
- `getCurrentUser()` — returns `{ id, email, role, full_name, is_active, is_prime_admin }` or `null`.

### Portal Visibility

Per-client toggle of which modules appear in the client portal. Default on portal-enable: `dashboard + tasks + queries` only. Admin opens additional modules per engagement. Every `/portal/<module>` page calls `ensureModuleVisible`; missing module → `notFound()`.

---

## Database & Supabase

### Clients

- **Server client** (`lib/supabase/server.ts`) — cookie-aware, respects RLS. Use in Server Components, Server Actions, Route Handlers.
- **Service-role client** (`lib/supabase/service-role.ts`) — **bypasses RLS**. Use ONLY in cron endpoints, webhooks, and one-off scripts. Never in browser. Never in user-initiated request paths.
- **Middleware client** (`lib/supabase/middleware.ts`) — session refresh in Next.js middleware.

### Row Level Security (RLS)

RLS is the **primary access-control boundary**. Every new table gets RLS policies before it gets data. The application layer adds capability gates as defense-in-depth, but RLS is the real lock.

### Schema

- Base schema: `db/schema.sql` v3 (locked, ~46 tables).
- Additive schema files: `db/schema-additions.sql` v3.1, `db/schema-v3-3.sql`, `db/schema-v3-4.sql`, `db/schema-bizlens.sql`, `db/schema-hr-tables.sql`, `db/schema-unified-inbox.sql`, `db/schema-weekly-approval.sql`.
- RLS policies: `db/rls-additive.sql`, `db/rls-capabilities.sql`, and various fix files.

### Key Patterns

- **Soft delete**: `is_deleted`, `deleted_at`, `deleted_by` on client-data tables.
- **Versioning**: `is_current` + `superseded_by` for GST/TDS/IT filings and financial data.
- **Audit log**: `global_audit_log` captures actor, timestamp, action, entity for sensitive writes.
- **Partial unique index** on tasks prevents duplicate generation at DB level.

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
- `__tests__/bizlens-service.test.ts` — BizLens math engine.
- `__tests__/task-transitions.test.ts` — Task status transitions and guardrails.
- `__tests__/compliance-calendar-engine.test.ts` — Compliance calendar logic.
- `__tests__/encryption.test.ts` — AES-256-GCM credentials vault encryption.
- `__tests__/validation-schemas.test.ts` — Zod schema validation.
- `__tests__/utils.test.ts` — Utility helpers.
- `__tests__/db-smoke.test.ts` — Database smoke tests.
- `__tests__/runtime-safety.test.ts` — Runtime safety checks.
- `__tests__/client-visible-status.test.ts` — Client-facing status rules.
- `__tests__/group-f-polish.test.ts` — Group F polish rules.
- `__tests__/result-helpers.test.ts` — Action result helpers.
- `__tests__/task-control-guardrails.test.ts` — Task control guardrails.

### RLS / Security Tests

Run `npm run db:rls-test` for automated RLS verification. There are also ten manual access-control tests defined in `memory/DPDP_AND_SECURITY.md` (Day-3 and Day-31 audit checklist).

### Adding Tests

When you add pure business logic in `lib/services/`, add corresponding tests in `__tests__/`. Mock repositories; test service behavior in isolation.

---

## Cron Jobs

Defined in `vercel.json`. All schedules are UTC.

| Path | Schedule (UTC) | Purpose |
|---|---|---|
| `/api/cron/generate-monthly-tasks` | `0 1 1 * *` | Create recurring tasks on 1st of month (~06:30 IST) |
| `/api/cron/due-alerts` | `30 3 * * *` | Daily task due-date email alerts (~09:00 IST) |
| `/api/cron/dsc-alerts` | `30 2 * * *` | Daily DSC expiry alerts (~08:00 IST) |
| `/api/cron/notification-digest` | `0 4 * * *` | Daily/weekly digest emails (~09:30 IST) |
| `/api/cron/generate-insights` | `30 16 * * 0` | Weekly insight generation (Sunday ~22:00 IST) |
| `/api/cron/refresh-compliance-events` | `0 1 * * *` | Refresh compliance calendar events |

Cron handlers:
- Must check `x-vercel-cron` header or `CRON_SECRET` query param.
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
CREDENTIALS_KEY=<32+ char random string>  # AES-256-GCM key for credentials vault

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
- **Historical reasoning**: `memory/PRD.md` + `BUILD_PLAN.md`
