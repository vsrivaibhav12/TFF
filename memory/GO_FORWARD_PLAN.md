# THE FISCAL FULCRUM — GO-FORWARD PLAN

**Version:** v3 (updated 2026-06-02)
**Status:** UX Revolution implementation in progress. Code-complete for P0-P1. P2-P7 partially done.

---

## What was implemented on 2026-06-02 (UX Revolution Sprint)

### Sprint A: Foundation — Nav, Auto-save, Keyboard Shortcuts ✅
- [x] **Keyboard shortcuts wired up** — `useGlobalShortcuts` integrated into AppShell
  - `?` — toggles shortcuts help overlay
  - `c` — context-sensitive creation (task/query/client/notice)
  - `Escape` — closes dock/help
  - `j`/`k` — dispatches navigation events for lists
  - Focus guards prevent shortcuts while typing in inputs
- [x] **Auto-save wired into `new-task-dialog.tsx`**
  - `useAutoSaveState('new-task', f, setF)` with 7-day TTL
  - Clears draft on successful creation
  - Merge order fixed: `{ ...parsed, ...prev }` so fresh props win
- [x] **Shortcuts help overlay** — converted to controlled component, triggered from AppShell

### Sprint B: Context Preservation — Universal Dock, Client 360° ✅
- [x] **DockLink in all tables** — replaces plain `<Link>` in admin/team task and client tables
  - Admin tasks table: `DockLink` + `TaskHoverCard`
  - Team tasks table: `DockLink` + `TaskHoverCard`
  - Admin clients table: `DockLink` + `ClientHoverCard`
  - Team clients table: `DockLink` + `ClientHoverCard`
- [x] **TaskHoverCard** — wired into task tables (admin + team)
- [x] **ClientHoverCard** — wired into client tables (admin + team)
- [x] **DockProvider** — already in all layouts (admin, team, portal)

### Sprint C: Command & Control — Command Center, Mission Control ✅
- [x] **Command Palette `/task` and `/query` commands fixed**
  - Dispatches `cmdk:new-task` / `cmdk:new-query` events
  - `new-task-dialog.tsx` and `new-query.tsx` listen and open automatically
  - Fallback: clicks `[data-testid="new-task-button"]` if present
- [x] **Command palette contextual filtering**
  - Results reordered based on current page (tasks → Tasks first, clients → Clients first, etc.)
  - Queries now included in Cmd-K search API
- [x] **Admin Mission Control Zone 3 rebuilt**
  - Replaced legacy `NeedsAttentionHub` + `FirmPulse` with live metric cards
  - Team attendance today (checked-in / total)
  - Open queries count
  - Pending approvals count
  - Removed hardcoded `₹14,25,000` revenue

### Sprint D: Data Density — Smart Tables, Kanban, Inline Editing ✅
- [x] **Team tasks table upgraded**
  - Virtual scrolling with `@tanstack/react-virtual`
  - Inline editing for Status and Priority via `EditableCell`
  - Search + sort (client-side)
  - Mobile cards with `SwipeableRow` for swipe-to-complete
- [x] **Admin + Team client tables upgraded**
  - Virtual scrolling with `@tanstack/react-virtual`
  - Inline editing for Group via `EditableCell`
  - Search + sort
- [x] **Kanban default view changed to `board`**
- [x] **Kanban reorder persistence fixed**
  - `onReorder` callback wired through `TaskBoard` → `KanbanBoard`
  - Local state updates prevent snap-back
  - Added `awaiting_client` and `review` columns

### Sprint E: Mobile & Polish — Hovercards, Gestures, Progressive Disclosure ✅
- [x] **PullToRefresh** wired into 4 pages (team tasks, team clients, portal tasks, portal queries)
- [x] **BottomSheet** wired into MobileFAB for creation flows
- [x] **Progressive disclosure in forms**
  - `new-task-dialog.tsx`: 4 essential fields visible, rest behind "More options"
  - `client-create-form.tsx`: 4 essentials visible, rest behind "More options"
  - `client-form.tsx`: 4 essentials visible, rest behind "More options"
- [x] **Mobile bottom nav respects portal visibility gates**
  - Tabs filtered by `visibleModules` prop
  - Dynamic grid columns based on visible tab count

### Schema & Database ✅
- [x] **`v_unified_inbox` SQL view** — `SECURITY INVOKER` + `is_deleted` filters
- [x] **`all_work_items` view** — replaced with `DROP VIEW` (dead code, security risk)
- [x] **`db/migrations/2026-06-02-create-unified-inbox-view.sql`** — migration stub created

### New Pages ✅
- [x] **`app/admin/inbox/page.tsx`** — unified chronological feed with grouped dates, inline actions (Snooze, Reply, Resolve, Act)
- [x] **`lib/repositories/inbox.ts`** — `listUnifiedInbox` repository function

---

## Remaining work (P2-P7)

### P2 — Architecture & Security
- [ ] Verify every Server Action has `requireRole` + `requireCapability`
- [ ] Verify `lib/actions/dock-data.ts` capability check
- [ ] Verify shortcuts check capabilities before navigation
- [ ] Verify portal detail pages have defense-in-depth auth
- [ ] Verify cron endpoints check `x-vercel-cron` + `CRON_SECRET`
- [ ] Verify service-role client isolation
- [ ] Verify `global_audit_log` INSERT policies
- [ ] Refactor `app/admin/page.tsx` direct Supabase queries to Server Actions (partially done with Zone 3)
- [ ] Create `lib/services/dashboard-service.ts` + `lib/repositories/dashboard.ts`

### P3 — Design System & Missing Features
- [ ] "View as client" toggle on Client 360°
- [ ] Audit timeline in Client 360°
- [ ] Pulse strip with 5 metric sparklines
- [ ] Form intelligence: GSTIN→state derivation, PAN auto-uppercase
- [ ] Natural language parsing in Command Center

### P4 — Code Quality
- [ ] Reduce `as any` casts from ~40 to < 50
- [ ] Add unit tests for `useAutoSaveState`
- [ ] Add unit tests for `useGlobalShortcuts`
- [ ] Add RLS tests for new tables/views

### P5 — Schema
- [ ] Apply `v_unified_inbox` view to production DB (migration pending)
- [ ] Verify missing indexes are applied
- [ ] Run `npm run db:rls-test`

### P6 — Per-screen Smoke Tests
- [ ] 30 manual checks across admin/team/portal screens

### P7 — Deployment
- [ ] `npm run build` passes ✅
- [ ] `npx tsc --noEmit` passes ✅
- [ ] Environment variables documented
- [ ] Vercel build passes
- [ ] Staging smoke test

---

## Test Results

| Suite | Status |
|---|---|
| bizlens-service | ✅ 12 tests |
| task-transitions | ✅ 11 tests |
| utils | ✅ 17 tests |
| validation-schemas | ✅ 16 tests |
| compliance-calendar-engine | ✅ 17 tests |
| db-smoke | ⚠️ 1 fail (`v_unified_inbox` not in live DB yet) |
| encryption | ✅ pass |
| result-helpers | ✅ pass |
| client-visible-status | ✅ pass |
| runtime-safety | ✅ pass |
| group-f-polish | ✅ pass |

**Build:** ✅ Clean
**TypeScript:** ✅ Zero errors

---

## Files Changed (2026-06-02)

~50 files modified including:
- `components/shell/app-shell.tsx` — keyboard shortcuts, footer
- `components/shell/command-palette.tsx` — slash commands, contextual filtering
- `components/shell/mobile-fab.tsx` — bottom sheet
- `components/shell/mobile-bottom-nav.tsx` — portal visibility gates
- `components/tasks/new-task-dialog.tsx` — auto-save, progressive disclosure
- `app/admin/tasks/tasks-table.tsx` — hovercards, docklink
- `app/team/tasks/tasks-table-client.tsx` — virtual scroll, inline edit, mobile swipe
- `app/admin/clients/clients-table-client.tsx` — virtual scroll, inline edit, docklink
- `app/team/clients/clients-table-client.tsx` — virtual scroll, inline edit, docklink
- `app/admin/page.tsx` — Zone 3 live metrics
- `app/admin/inbox/page.tsx` — NEW unified inbox
- `lib/repositories/inbox.ts` — NEW
- `lib/hooks/use-auto-save.ts` — merge order fix
- `lib/hooks/use-global-shortcuts.ts` — no changes (already correct)
- `db/schema-unified-inbox.sql` — `is_deleted` filter added
- `db/schema-all-work-items.sql` — replaced with DROP VIEW
