# Master Fix & Implementation List
## The Fiscal Fulcrum — UX Revolution Sprint Audit

**Generated:** 2026-06-02
**Total Items:** 150+
**Rule:** Every item must be checked off before the sprint can be called "complete."

---

## P0 — BUILD & RUNTIME BLOCKERS (Cannot Deploy Without These)

### Build Failures
- [ ] **P0-001** Add `'use client';` to line 1 of `app/admin/tasks/tasks-table.tsx` (imports `useState`, `useRouter`, `useSWRInfinite`, `useVirtualizer` without directive)
- [ ] **P0-002** Fix `app/admin/tasks/tasks-table.tsx` line 118: `isLoading` is undefined. Destructure it from `useSWRInfinite(...)` return value
- [ ] **P0-003** Fix `app/admin/tasks/tasks-table.tsx` line 15: `fetchTasksPageAction` is imported but does not exist in `lib/actions/tasks.ts`. Either implement the action or remove the import and replace the call
- [ ] **P0-004** Verify `npm run build` passes cleanly after P0-001 through P0-003
- [ ] **P0-005** Verify `npx tsc --noEmit` returns zero errors

### Runtime Crashes
- [ ] **P0-006** Fix `app/admin/page.tsx` lines 55–69: `Promise.all` returns 13 promises but only 11 are destructured. Add `attendanceToday` (index 11) and `teamMembers` (index 12) to the destructuring array
- [ ] **P0-007** Remove or render unused data fetches in `app/admin/page.tsx`: `recentActivity`, `upcomingDeadlines`, `healthScore`/`healthMetrics` are fetched but never displayed
- [ ] **P0-008** Remove dead imports from `app/admin/page.tsx`: `ActivityFeed`, `AdminQuickActions`, `HealthScoreCard` are imported but never rendered

---

## P1 — FUNCTIONAL GAPS & BROKEN FEATURES

### Sprint A: Navigation & Foundation
- [ ] **P1-001** Change `app-shell.tsx` contextual panel width from 240px to 280px (or update spec to 240px and align content margin)
- [ ] **P1-002** Make contextual panel actually contextual: when in `/admin/tasks`, show recent tasks + saved filters instead of the full nav list
- [ ] **P1-003** Add `DockProvider` and `<UniversalDetailDock />` to `app/team/layout.tsx`
- [ ] **P1-004** Add `DockProvider` and `<UniversalDetailDock />` to `app/portal/layout.tsx`
- [ ] **P1-005** Drive `MobileBottomNav` in portal layout from the filtered/visible `nav` array so disabled modules don't appear as tabs
- [ ] **P1-006** Fix `app-shell.tsx` user dropdown positioning (`left-[80px]` is fragile against `w-[72px]` rail)
- [ ] **P1-007** Add `aria-expanded` and `aria-controls` to user menu toggle in rail
- [ ] **P1-008** Namespace auto-save keys with user ID: `` `draft:${userId}:${key}` `` in `lib/hooks/use-auto-save.ts`
- [ ] **P1-009** Fix auto-save rehydration merge order so fresh props aren't clobbered by stale draft (`{ ...parsed, ...prev }` or `shouldRehydrate` predicate)
- [ ] **P1-010** Add TTL/expiry to auto-save drafts (e.g., discard after 7 days)
- [ ] **P1-011** Surface `localStorage` quota errors to user (toast notification)
- [ ] **P1-012** Fix `use-global-shortcuts.ts`: `j`/`k`/`e`/`a` dispatch `CustomEvent('tff-shortcut')` but **zero components listen**. Either implement listeners or remove from help overlay
- [ ] **P1-013** Fix `c` shortcut: replace invalid Playwright selector `button:has-text("New")` with valid DOM API
- [ ] **P1-014** Gate `c` and `g → c` shortcuts by capability — check `filterNavByCapabilities` before navigating
- [ ] **P1-015** Use `router.push()` instead of `window.location.href` in shortcut fallbacks to avoid full page reloads
- [ ] **P1-016** Filter shortcuts help overlay by role/capability — don't show "Go to clients" to client users
- [ ] **P1-017** Add `e.preventDefault()` on `j`/`k` to prevent page scroll when listeners are implemented
- [ ] **P1-018** Add focus guards to global shortcuts: disable when `INPUT`/`TEXTAREA`/`SELECT`/`contentEditable` is focused

### Sprint B: Universal Detail Dock & Client 360°
- [ ] **P1-019** **DECISION REQUIRED:** Choose between Option A (commit to dock) or Option B (commit to @modal). Cannot ship both.
  - **Option A:** Remove ALL `@modal` routes from `app/team/@modal/` and `app/portal/@modal/`. Delete `components/shell/modal-wrapper.tsx`. Convert every `<Link href="...">` in tables/cards to dock `push()` triggers. Implement `getClientDockData`, `getNoticeDockData`, `getQueryDockData`. Add dock providers to team/portal.
  - **Option B:** Delete `components/shell/universal-detail-dock.tsx`, `lib/state/dock-state.tsx`, `lib/actions/dock-data.ts`, and all dock references. Keep @modal everywhere.
- [ ] **P1-020** If choosing Option A: implement `DockLink` helper component that calls `push()` with correct entity type
- [ ] **P1-021** If choosing Option A: fix URL sync in `dock-state.tsx` to not destroy stack on unrelated query-param changes (filters, sorting, pagination)
- [ ] **P1-022** If choosing Option A: add visual breadcrumb trail inside dock showing full stack, not just current + back arrow
- [ ] **P1-023** If choosing Option A: uncomment capability check in `lib/actions/dock-data.ts`
- [ ] **P1-024** Client 360° (`client-detail-shell.tsx`): replace plain `<Link>` in Active Work with dock triggers (or @modal links if Option B)
- [ ] **P1-025** Client 360° (`team-client-detail-shell.tsx`): add inline edit capability instead of redirecting to `/admin/clients/...`
- [ ] **P1-026** Client 360° (`app/team/clients/[id]/page.tsx`): wrap Activity Stream in `<Suspense>` boundary (currently eager fetch)
- [ ] **P1-027** Remove unused `AuditTimeline` import from `client-detail-shell.tsx`
- [ ] **P1-028** Fix `client-detail-shell.tsx` `h-[calc(100vh-6.5rem)]` to not assume fixed header height

### Sprint C: Command Center & Mission Control
- [ ] **P1-029** Fix Command Palette `/task` slash command: currently dispatches orphaned `CustomEvent('tff-shortcut')`. Implement actual task creation flow (open dialog or navigate)
- [ ] **P1-030** Fix Command Palette `/query` slash command: same orphan event issue
- [ ] **P1-031** Add contextual filtering to Command Palette search (e.g., if on Tasks page, prioritize task results)
- [ ] **P1-032** Fix Command Palette `flatItems.indexOf(i)` O(n²) performance issue
- [ ] **P1-033** Guard against `active = -1` when `flatItems` is empty in Command Palette
- [ ] **P1-034** Add error feedback when `/api/cmdk/search` fetch fails (empty catch block)
- [ ] **P1-035** Fix `app/admin/page.tsx` Zone 3 Monitor: replace hardcoded `₹14,25,000` revenue MTD with real query or remove the card
- [ ] **P1-036** Fix `app/admin/page.tsx` Zone 3: `NeedsAttentionHub` and `FirmPulse` are legacy widgets. Replace with new live metric cards per design spec
- [ ] **P1-037** Refactor `app/admin/page.tsx` to use Server Actions → Services → Repositories instead of direct Supabase queries inline
- [ ] **P1-038** Create `lib/actions/dashboard.ts` with actions for dashboard data fetching
- [ ] **P1-039** Replace client-side compliance filtering (fetch 500 rows, filter in memory) with aggregate Supabase query
- [ ] **P1-040** Wire up `ActivityFeed`, `AdminQuickActions`, `HealthScoreCard` on dashboard or remove their imports and data fetches
- [ ] **P1-041** Render `totalPendingApprovals` on dashboard beyond just a pulse badge
- [ ] **P1-042** Fix `components/shell/command-palette.tsx` line with tautology `basePath === '/admin' ? '/admin' : '/admin'`

### Sprint D: Smart Tables, Kanban, Inline Editing
- [ ] **P1-043** Fix `app/admin/tasks/tasks-table.tsx`: `<TableRow>` uses `absolute` + `transform: translateY()` inside `<tbody>`. Test in Safari and fix if broken
- [ ] **P1-044** Fix `app/admin/tasks/tasks-table.tsx`: stop directly mutating SWR cached data (`t.priority = val`). Use SWR `mutate()` to update cache immutably
- [ ] **P1-045** Fix `app/admin/tasks/tasks-table.tsx`: after inline edit, re-sort or revalidate so edited rows reposition correctly
- [ ] **P1-046** Add virtual scrolling to `app/team/tasks/tasks-table-client.tsx` (currently uses old pagination buttons)
- [ ] **P1-047** Add virtual scrolling to `components/clients/clients-table.tsx`
- [ ] **P1-048** Add virtual scrolling to `app/admin/clients/clients-table-client.tsx`
- [ ] **P1-049** Add `useSWRInfinite` to team tasks page for pagination-less scrolling
- [ ] **P1-050** Add inline editing to team tasks table (`tasks-table-client.tsx`)
- [ ] **P1-051** Add inline editing to client tables (`clients-table.tsx`, `clients-table-client.tsx`)
- [ ] **P1-052** Add debounce (500ms) to `EditableCell` before calling `onSave`
- [ ] **P1-053** Extend `EditableCell` beyond `Select` dropdown: support text input, date picker, number fields
- [ ] **P1-054** Add error toast/feedback when `EditableCell` optimistic update reverts
- [ ] **P1-055** Fix `EditableCell` click handler: `e.preventDefault(); e.stopPropagation()` may interfere with row navigation. Review interaction model
- [ ] **P1-056** Fix Kanban board: within-column reordering snaps back because `KanbanBoard` never manages order state. Either implement `onReorder` persistence or remove `SortableContext`
- [ ] **P1-057** Fix Kanban board keyboard sensor: currently non-functional because no reorder state exists
- [ ] **P1-058** Set Kanban as default view: change `useState<'list' | 'board'>('list')` to `('board')`
- [ ] **P1-059** Add Kanban board view to team tasks page (`app/team/tasks/page.tsx`)
- [ ] **P1-060** Add `onReorder` callback prop to `KanbanBoard` and implement persistence
- [ ] **P1-061** Replace `any` types in `kanban-board.tsx` with proper TypeScript interfaces
- [ ] **P1-062** Add `@dnd-kit` touch sensor configuration for mobile drag-and-drop
- [ ] **P1-063** Add screen-reader announcements for Kanban drag operations

### Sprint E: Mobile, Hovercards, Progressive Disclosure, RLS
- [ ] **P1-064** Install `@radix-ui/react-hover-card` and create `components/ui/hover-card.tsx`
- [ ] **P1-065** Implement hovercard preview on task links (show assignee, due date, latest notes, status)
- [ ] **P1-066** Implement hovercard preview on client links (show compliance score, open work count, primary contact)
- [ ] **P1-067** Implement hovercard preview on notice links (show authority, due date, status)
- [ ] **P1-068** Add swipe-to-action on mobile list rows (like iOS Mail)
- [ ] **P1-069** Add pull-to-refresh indicator on mobile lists
- [ ] **P1-070** Add Floating Action Button (FAB) for primary creation action on mobile
- [ ] **P1-071** Add bottom sheets for all creation flows on mobile (new task, new query, etc.)
- [ ] **P1-072** Add progressive disclosure to `components/tasks/new-task-dialog.tsx`: show 4 essential fields, collapse rest behind "More options"
- [ ] **P1-073** Add progressive disclosure to `app/admin/clients/client-form.tsx`
- [ ] **P1-074** Add progressive disclosure to `app/admin/clients/new/client-create-form.tsx`
- [ ] **P1-075** Add progressive disclosure to `components/operations/bizlens/input-form.tsx`
- [ ] **P1-076** Create `db/schema-unified-inbox.sql` with `v_unified_inbox` view using `SECURITY INVOKER`
- [ ] **P1-077** Write RLS tests for `v_unified_inbox` view (`npm run db:rls-test`)
- [ ] **P1-078** Implement `app/admin/inbox/page.tsx` rendering the unified chronological feed
- [ ] **P1-079** Add inline action buttons to inbox feed (Snooze, Reply, Resolve, Act)

---

## P2 — ARCHITECTURE & SECURITY

### Auth & Capability
- [ ] **P2-001** Verify every Server Action in `lib/actions/*.ts` has `requireRole` + `requireCapability` gates
- [ ] **P2-002** Verify `lib/actions/dock-data.ts` has uncommented capability check before shipping
- [ ] **P2-003** Verify shortcuts (`c`, `g → c`) check capabilities before navigation
- [ ] **P2-004** Verify auto-save keys include `userId` to prevent cross-session draft leakage
- [ ] **P2-005** Verify portal detail pages (`/portal/tasks/[id]`, `/portal/queries/[id]`) have defense-in-depth auth (not just RLS)
- [ ] **P2-006** Verify all cron endpoints check `x-vercel-cron` header or `CRON_SECRET`
- [ ] **P2-007** Verify service-role client (`createServiceClient`) is never used in user-facing request paths
- [ ] **P2-008** Verify `global_audit_log` has proper INSERT policies (was flagged as broken in prior audit)
- [ ] **P2-009** Verify `all_work_items` view is either secured with `SECURITY INVOKER` + `is_deleted` filters or deleted entirely
- [ ] **P2-010** Verify `promoteToAdminAction` writes to audit log correctly

### Three-Layer Architecture
- [ ] **P2-011** Refactor `app/admin/page.tsx` to call Server Actions instead of direct Supabase queries
- [ ] **P2-012** Create `lib/services/dashboard-service.ts` for dashboard data aggregation
- [ ] **P2-013** Create `lib/repositories/dashboard.ts` for dashboard DB queries
- [ ] **P2-014** Verify `lib/actions/dashboard.ts` follows the action pattern (auth + validate + call service + revalidate)
- [ ] **P2-015** Ensure no new direct DB queries are introduced in page components outside of `lib/repositories/`

### State Management
- [ ] **P2-016** If keeping Universal Dock: verify `lib/state/dock-state.tsx` uses split-context pattern (separate State and Actions contexts) to prevent unnecessary re-renders
- [ ] **P2-017** If keeping Universal Dock: verify URL query sync doesn't conflict with existing URL params (filters, sorting, pagination)

---

## P3 — MISSING IMPLEMENTATIONS VS DESIGN SPEC

### Design System Drift
- [ ] **P3-001** Verify no `stone-*` colors remain in codebase (replace with `zinc-*`)
- [ ] **P3-002** Verify no `rounded-[20px]` remains (replace with `rounded-xl`)
- [ ] **P3-003** Verify `bg-zinc-50` is applied to main layout canvas
- [ ] **P3-004** Add `tabular-nums` to every currency and date display
- [ ] **P3-005** Increase empty state icons from `h-6 w-6` to `h-12 w-12`
- [ ] **P3-006** Add 2px `teal-500` left border to active sidebar items
- [ ] **P3-007** Remove `main { animation: pageIn 0.4s }` if still present (causes layout shift)

### Components That Should Be Server Components
- [ ] **P3-008** Remove `'use client'` from UI primitives: `button.tsx`, `card.tsx`, `input.tsx`, `skeleton.tsx`, `badge.tsx` (if still present)
- [ ] **P3-009** Verify `table.tsx` does not have `'use client'`
- [ ] **P3-010** Keep `'use client'` only on components that genuinely need interactivity (state, effects, hooks)

### Command Center Enhancements
- [ ] **P3-011** Add natural language parsing to Command Center (`new task for Acme Corp`)
- [ ] **P3-012** Add recent items to Command Center empty state
- [ ] **P3-013** Add saved searches to Command Center
- [ ] **P3-014** Add "Go back to [last 3 pages]" to Command Center empty state

### Client 360° Enhancements
- [ ] **P3-015** Add Pulse strip with 5 metric sparklines to Client 360°
- [ ] **P3-016** Add "View as client" toggle to Client 360°
- [ ] **P3-017** Surface audit timeline in Client 360° (currently `AuditTimeline` import is unused)

### Form Intelligence
- [ ] **P3-018** Add smart defaults to all creation forms: assignee = current user, due date = tomorrow, priority = medium
- [ ] **P3-019** Add field derivation: GSTIN auto-fills state, PAN auto-uppercases, client selection filters sub-services
- [ ] **P3-020** Add inline validation with green checkmarks for valid fields
- [ ] **P3-021** Add AI suggest: "Create similar tasks for all GST clients" one-click duplication

### Mobile Consistency
- [ ] **P3-022** Add responsive check to every sprint's Definition of Done: "All new screens pass 375px viewport check"
- [ ] **P3-023** Ensure touch targets ≥ 44px on all mobile interactive elements
- [ ] **P3-024** Ensure no horizontal scroll on mobile
- [ ] **P3-025** Add `pb-[env(safe-area-inset-bottom,0)]` to all fixed bottom elements

---

## P4 — CODE QUALITY & PERFORMANCE

### TypeScript
- [ ] **P4-001** Reduce `as any` casts from 423 to < 50
- [ ] **P4-002** Fix all `// @ts-ignore` and `// @ts-expect-error` comments
- [ ] **P4-003** Add proper types to `kanban-board.tsx` (replace all `any`)
- [ ] **P4-004** Add proper types to `dock-data.ts` payload (replace `useState<any>(null)`)
- [ ] **P4-005** Run `npx tsc --noEmit` and fix all errors

### ESLint
- [ ] **P4-006** Install ESLint: `npm install --save-dev eslint`
- [ ] **P4-007** Run `npm run lint` and fix all warnings
- [ ] **P4-008** Add ESLint rule to forbid `'use client'` on UI primitives

### Testing
- [ ] **P4-009** Add unit tests for `useAutoSaveState` in `__tests__/`
- [ ] **P4-010** Add unit tests for `useGlobalShortcuts` in `__tests__/`
- [ ] **P4-011** Add unit tests for `EditableCell` optimistic UI behavior
- [ ] **P4-012** Add RLS tests for any new tables or views
- [ ] **P4-013** Add runtime safety tests for new Server Actions

### Performance
- [ ] **P4-014** Add React DevTools Profiler check: Kanban board re-renders should not cascade to unaffected cards
- [ ] **P4-015** Verify virtualized table only renders visible rows (+ overscan)
- [ ] **P4-016** Verify `useSWRInfinite` has `revalidateFirstPage: false` to prevent refetching page 1 on every scroll
- [ ] **P4-017** Remove unused imports across all modified files
- [ ] **P4-018** Remove dead code: `all_work_items` view if not used, unused migration stubs

### Accessibility
- [ ] **P4-019** Add `aria-label` to all icon-only buttons in rail
- [ ] **P4-020** Add keyboard focus trap to dock panel
- [ ] **P4-021** Add `aria-live` region for shortcut help overlay
- [ ] **P4-022** Ensure color contrast passes WCAG AA on all new UI (teal on white, red on white)
- [ ] **P4-023** Add skip-to-content link if not already present

---

## P5 — SCHEMA & DATABASE

### Views
- [ ] **P5-001** Create `v_unified_inbox` view: `UNION` of tasks, notices, queries, compliance_events grouped by `due_date`
- [ ] **P5-002** Add `SECURITY INVOKER` to `v_unified_inbox`
- [ ] **P5-003** Add `is_deleted = false` filter to all underlying tables in `v_unified_inbox`
- [ ] **P5-004** Either fix `all_work_items` view (add `is_deleted` filters, `SECURITY INVOKER`) or delete it entirely
- [ ] **P5-005** Either implement or delete migration stub `2026-06-01-missing-indexes-and-constraints.sql`

### Indexes
- [ ] **P5-006** Verify missing indexes from `2026-06-02-add-missing-indexes.sql` are applied in production
- [ ] **P5-007** Add index on `tasks(due_date, status)` if not present (heavily queried by dashboard)
- [ ] **P5-008** Add index on `compliance_calendar_events(due_date)` if not present
- [ ] **P5-009** Add index on `global_audit_log(performed_at)` if not present

### RLS
- [ ] **P5-010** Verify `v_unified_inbox` respects RLS on all underlying tables when queried via Supabase server client
- [ ] **P5-011** Verify `global_audit_log` has INSERT policy for authenticated users
- [ ] **P5-012** Run `npm run db:rls-test` and ensure all tests pass

---

## P6 — PER-SCREEN AUDIT CHECKLIST

### Admin Screens
- [ ] **P6-001** `/admin` (Dashboard): No runtime crashes, 4 zones render correctly, all data is live
- [ ] **P6-002** `/admin/clients`: Table loads, virtual scroll works, inline editing works
- [ ] **P6-003** `/admin/clients/[id]`: Single-scroll 360° view, sticky header, lazy Activity Stream
- [ ] **P6-004** `/admin/tasks`: Kanban is default, drag-and-drop works, inline editing works, virtual scroll works
- [ ] **P6-005** `/admin/tasks/[id]`: Opens in dock (if Option A) or @modal (if Option B)
- [ ] **P6-006** `/admin/notices`: Table loads, filters work
- [ ] **P6-007** `/admin/queries`: Table loads, reply works
- [ ] **P6-008** `/admin/team`: Roster loads, capability editing works
- [ ] **P6-009** `/admin/bizlens`: Input form has progressive disclosure
- [ ] **P6-010** `/admin/inbox`: NEW — Unified inbox renders chronological feed (if implemented)

### Team Screens
- [ ] **P6-011** `/team`: Dashboard loads, "My Day" cards render
- [ ] **P6-012** `/team/clients`: Table loads, client links open correctly
- [ ] **P6-013** `/team/clients/[id]`: 360° view loads, lazy Activity Stream
- [ ] **P6-014** `/team/tasks`: Kanban or list loads, inline editing works
- [ ] **P6-015** `/team/tasks/[id]`: Opens in dock or @modal consistently
- [ ] **P6-016** `/team/attendance`: Check-in/out works
- [ ] **P6-017** `/team/leave`: Form submits correctly

### Portal Screens
- [ ] **P6-018** `/portal`: Dashboard loads, compliance score renders
- [ ] **P6-019** `/portal/tasks`: Tabbed by status, tasks load
- [ ] **P6-020** `/portal/tasks/[id]`: Detail view opens
- [ ] **P6-021** `/portal/queries`: List loads, new query works
- [ ] **P6-022** `/portal/calendar`: Events render
- [ ] **P6-023** `/portal/bizlens`: Reports list loads
- [ ] **P6-024** `/portal/notices`: List loads

### Global / Shell
- [ ] **P6-025** Command Palette (`Cmd+K`): Search works, `/task` and `/query` create entities
- [ ] **P6-026** Keyboard shortcuts: `j`/`k` navigate lists, `e` expands rows, `a` acts on items, `c` creates, `?` shows help
- [ ] **P6-027** Detail Dock: Opens from tables/cards, stacks correctly, back button works, pop-out works
- [ ] **P6-028** Notifications bell: Polls every 30s, unread badge accurate
- [ ] **P6-029** Mobile bottom nav: All tabs work, "More" drawer opens, safe area padding correct
- [ ] **P6-030** Mobile hamburger drawer: All sections render, sign-out works

---

## P7 — DEPLOYMENT CHECKLIST

- [ ] **P7-001** `npm run build` passes with zero errors
- [ ] **P7-002** `npx tsc --noEmit` passes with zero errors
- [ ] **P7-003** `npm run lint` passes (or ESLint is installed and run)
- [ ] **P7-004** All unit tests pass: `node --test` or `npx tsx --test`
- [ ] **P7-005** RLS tests pass: `npm run db:rls-test`
- [ ] **P7-006** No `console.log` or `console.error` leaks in production code
- [ ] **P7-007** Environment variables documented: no new `NEXT_PUBLIC_` secrets added
- [ ] **P7-008** Database migrations applied in correct order
- [ ] **P7-009** Vercel build passes (check `maxDuration` on cron routes)
- [ ] **P7-010** Smoke test on staging: log in as admin, team, and client; verify core flows

---

## How to Use This List

1. **Copy this into your issue tracker** (GitHub Projects, Jira, Linear).
2. **Tag each item with the sprint** it belongs to (A–E).
3. **Assign P0 items immediately** — they are non-negotiable blockers.
4. **Do not call the sprint "complete" until P0 + P1 + P2 are 100% done.**
5. **P3–P7 can ship in a follow-up polish sprint** if business pressure requires early release, but P0–P2 are the definition of "working software."

**Estimated effort to clear P0–P2:** 3–4 developer-days.
**Estimated effort to clear entire list:** 3–4 developer-weeks.
