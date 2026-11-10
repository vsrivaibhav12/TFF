# Comprehensive Sprint Audit Report
## UX Revolution: The Fiscal Fulcrum Implementation

**Audit Date:** 2026-06-02
**Auditor:** Kimi Code CLI (comprehensive codebase analysis)
**Scope:** All 5 sprints (A–E), build integrity, schema consistency, security, performance
**Verdict:** ❌ **NOT PRODUCTION-READY** — Critical build failures, runtime crashes, and dead code block deployment.

---

## Executive Summary

| Sprint | Theme | Completion | Status |
|---|---|---|---|
| A | Foundation (Nav, Auto-save, Shortcuts) | ~60% | 🟡 Partial |
| B | Context Preservation (Dock, Client 360°) | ~50% | 🔴 Broken |
| C | Command & Control (Cmd Center, Dashboard) | ~45% | 🔴 Crashes |
| D | Data Density (Tables, Kanban, Inline Edit) | ~40% | 🔴 Build Fail |
| E | Mobile & Polish (Hovercards, Gestures, RLS) | ~15% | 🔴 Missing |

**Critical Blockers (must fix before any deployment):**
1. `npm run build` **fails** — `tasks-table.tsx` missing `'use client'`
2. `app/admin/page.tsx` **crashes at runtime** — undefined `attendanceToday` / `teamMembers`
3. `tasks-table.tsx` references **non-existent export** `fetchTasksPageAction`
4. Universal Detail Dock is **dead code** — zero trigger points in entire codebase
5. `@modal` parallel routes **still active in team/portal** while admin removed them — UX split

---

## 🔴 Critical Findings

### 1. BUILD FAILURE — `app/admin/tasks/tasks-table.tsx`
**Severity: BLOCKER**

The file imports `useState`, `useEffect`, `useRef`, `useRouter`, `usePathname`, `useSearchParams`, `useConfirm`, `useSWRInfinite`, and `useVirtualizer` but is **missing the `'use client'` directive**.

**Result:** `npm run build` fails with webpack errors. The admin tasks page is completely unreachable in production.

**Fix:** Add `'use client';` to line 1 of `app/admin/tasks/tasks-table.tsx`.

---

### 2. RUNTIME CRASH — `app/admin/page.tsx`
**Severity: BLOCKER**

Lines 73–75 reference `attendanceToday` and `teamMembers`, but the `Promise.all` destructuring on lines 55–69 only extracts **11 results** while the array contains **13 promises**.

```ts
// Missing from destructuring:
listAttendanceForDate(todayIso),  // index 11 → attendanceToday
listTeamUsers(),                  // index 12 → teamMembers
```

**Result:** The admin dashboard throws `ReferenceError: attendanceToday is not defined` on every request.

**Fix:** Add `attendanceToday` and `teamMembers` to the destructuring array.

---

### 3. MISSING EXPORT — `fetchTasksPageAction`
**Severity: BLOCKER**

`app/admin/tasks/tasks-table.tsx` line 15 imports `fetchTasksPageAction` from `@/lib/actions/tasks`, but **no such export exists** in `lib/actions/tasks.ts`.

**Result:** TypeScript error + potential runtime crash when the infinite scroll trigger fires.

**Fix:** Either implement `fetchTasksPageAction` in `lib/actions/tasks.ts` or replace the call with an existing action.

---

### 4. UNDEFINED VARIABLE — `isLoading`
**Severity: BLOCKER**

`app/admin/tasks/tasks-table.tsx` line 118:
```ts
const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined');
```
`isLoading` is never declared. It should be derived from `useSWRInfinite`'s return value.

**Fix:** Destructure `isLoading` from `useSWRInfinite(...)`.

---

### 5. UNIVERSAL DETAIL DOCK — Dead Code
**Severity: HIGH**

The dock infrastructure exists (`components/shell/universal-detail-dock.tsx`, `lib/state/dock-state.tsx`, `lib/actions/dock-data.ts`) but:
- **Zero components call `useDockActions().push()`**
- The dock can only open via manual URL manipulation (`?dock=task:123`)
- Only `task` type is rendered — `client`, `notice`, `query` show "View for X not implemented yet"
- `DockProvider` is **only in `app/admin/layout.tsx`** — team and portal have no provider
- URL sync logic clears the stack on unrelated query-param changes (filters, sorting)

**Meanwhile:** `app/team/@modal/` and `app/portal/@modal/` **still exist and are active**. The team/portal sections use parallel-route modals while admin uses a dead dock. This is a schizophrenic UX.

**Fix (choose one):**
- **Option A (Recommended):** Commit to the dock. Remove all `@modal` routes from team/portal, add `DockProvider` to all layouts, replace `<Link href="...">` with dock triggers in tables/cards, implement `getClientDockData` / `getNoticeDockData` / `getQueryDockData`.
- **Option B:** Delete the dock code entirely and keep `@modal` everywhere. Less work, consistent UX.

---

## Sprint-by-Sprint Audit

---

### Sprint A: Foundation — Nav, Auto-save, Keyboard Shortcuts

#### ContextRail & Panel
| Requirement | Status |
|---|---|
| 72px persistent rail | ✅ Implemented |
| 280px contextual panel | ❌ **240px, not contextual** — always shows full nav list |
| Driven by existing nav config | ✅ Yes, respects capabilities |
| DockProvider in all layouts | ❌ Admin only; team/portal missing |

**Issues:**
- Panel title is hardcoded to `"Navigation"` instead of showing recent items/saved views for the active module.
- `app/portal/layout.tsx` mobile bottom nav ignores portal visibility gates — disabled modules still appear as tabs.

#### Auto-Save Hook (`lib/hooks/use-auto-save.ts`)
| Requirement | Status |
|---|---|
| Syncs RHF to localStorage | ✅ Implemented |
| Debounced save (500ms) | ✅ Implemented |
| Used in `new-task-dialog.tsx` | ✅ Wired correctly |

**Issues:**
- 🔴 **Cross-user draft leakage:** Key is `'new-task-form-draft'` (global per browser). If Alice logs out and Bob logs in, Bob sees Alice's draft.
- 🔴 **Overwrites fresh props:** Rehydration does `{ ...prev, ...parsed }`, so a passed `defaultClientId` is clobbered by stale draft.
- 🟡 No TTL/expiry — months-old drafts restore silently.
- 🟡 `localStorage` quota errors fail silently.

**Fix:** Namespace keys with user ID: `` `draft:${userId}:${key}` ``. Fix merge order to `{ ...parsed, ...prev }` or accept a `shouldRehydrate` predicate.

#### Keyboard Shortcuts (`lib/hooks/use-global-shortcuts.ts`)
| Requirement | Status |
|---|---|
| `?` help overlay | ✅ Implemented |
| `j`/`k` navigate | ❌ **Dispatches events with zero consumers** |
| `e` expand | ❌ **Dispatches events with zero consumers** |
| `a` act | ❌ **Dispatches events with zero consumers** |
| `c` create | ⚠️ **Navigates via `window.location.href` without capability checks** |
| `g` goto mode | ✅ Implemented |

**Issues:**
- `j`/`k`/`e`/`a` fire `CustomEvent('tff-shortcut')` but **no component listens** for these events.
- `c` shortcut uses invalid Playwright selector `button:has-text("New")` (not valid DOM API), falls back to hard navigation.
- `c` and `g → c` bypass capability checks — a team member without `tasks.create` can be navigated to `/admin/tasks/bulk-create`.
- Shortcuts help overlay shows all shortcuts to all roles regardless of permissions.
- No `e.preventDefault()` on `j`/`k`, so they may scroll the page.

---

### Sprint B: Context Preservation — Universal Dock, Client 360°

#### Universal Detail Dock
| Requirement | Status |
|---|---|
| Global state-driven dock | ✅ Shell exists |
| Supports tasks/clients/notices/queries | ❌ **Task only; others show "Not implemented"** |
| Infinite stacking / breadcrumbs | ⚠️ Stack state exists but UI shows only current + back arrow |
| Admin layout integration | ✅ Present |
| Team/portal layout integration | ❌ **Missing** |
| Replaces `@modal` parallel routes | ❌ **Admin removed; team/portal still use @modal** |

**Issues:**
- Zero trigger points — no table row, card, or link calls `push()`.
- URL sync destroys stack on unrelated query changes.
- `push()` adds a new history entry per layer; back button steps through each layer individually.
- `lib/actions/dock-data.ts` has commented-out capability check.

#### Client 360°
| Requirement | Admin | Team |
|---|---|---|
| Single vertically scrolling page | ✅ Yes | ✅ Yes |
| Sticky header | ✅ Yes | ✅ Yes |
| Parallel data fetching (`Promise.all`) | ✅ Yes | ✅ Yes |
| Lazy-loaded Activity Stream (`<Suspense>`) | ✅ Yes | ❌ **Eager fetch** |
| Links open dock (not full page) | ❌ **Plain `<Link>` everywhere** | ❌ **Plain `<Link>` everywhere** |

**Issues:**
- Task/notice/query links inside Active Work use `<Link href={`/admin/tasks/${t.id}`}>` — they navigate away from the 360° page instead of opening the dock.
- `client-detail-shell.tsx` has unused `AuditTimeline` import.
- `team-client-detail-shell.tsx` redirects to `/admin/clients/` for edits instead of editing inline.

---

### Sprint C: Command & Control — Command Center 2.0, Mission Control

#### Command Center 2.0
| Requirement | Status |
|---|---|
| `/task` creation shortcut | ❌ **UI stub exists; dispatches orphaned event** |
| `/query` creation shortcut | ❌ **UI stub exists; dispatches orphaned event** |
| Contextual filtering | ❌ **Search returns same flat results regardless of page** |
| Quick actions when empty | ✅ Yes |
| Dynamic entity search | ✅ Yes |

**Issues:**
- `/task` and `/query` slash commands dispatch `CustomEvent('tff-shortcut', { detail: 'c' })` which has **no listeners** anywhere in the codebase.
- `flatItems.indexOf(i)` in render loop is O(n²).
- `active` index can become `-1` on empty results.
- Empty catch block on search failure — no user feedback.

#### Admin Mission Control (`app/admin/page.tsx`)
| Zone | Status |
|---|---|
| Zone 1 — Red Alert | ✅ Implemented (pulse alerts + overdue count) |
| Zone 2 — Today | ✅ Implemented (stats + priority list) |
| Zone 3 — Monitor | ⚠️ **Team attendance is real; Revenue MTD is hardcoded `₹14,25,000`** |
| Zone 4 — Pipeline | ✅ Implemented (upcoming notices) |

**Issues:**
- 🔴 **Runtime crash** from undefined `attendanceToday` / `teamMembers` (see Critical Finding #2).
- 🔴 **Direct Supabase queries** inline instead of Server Actions → Services → Repositories. Violates `AGENTS.md` three-layer architecture.
- `HealthScoreCard`, `ActivityFeed`, `AdminQuickActions` are **imported but never rendered**.
- `recentActivity` and `upcomingDeadlines` are fetched but unused.
- `complianceData` fetches 500 rows and filters client-side; should be an aggregate query.
- `totalPendingApprovals` computed but not shown beyond a pulse badge.

---

### Sprint D: Data Density — Smart Tables, Kanban, Inline Editing

#### Smart Tables
| Table | Virtual Scroll | Infinite Scroll | Inline Edit |
|---|---|---|---|
| Admin tasks (`tasks-table.tsx`) | ✅ Yes | ✅ Yes | ⚠️ Partial |
| Team tasks (`tasks-table-client.tsx`) | ❌ No | ❌ No (pagination buttons) | ❌ No |
| Clients (`clients-table.tsx`) | ❌ No | ❌ No | ❌ No |
| Admin clients (`clients-table-client.tsx`) | ❌ No | ❌ No | ❌ No |

**Issues in `app/admin/tasks/tasks-table.tsx`:**
- 🔴 Missing `'use client'` directive (build failure).
- 🔴 `isLoading` is undefined (line 118).
- 🔴 `fetchTasksPageAction` import does not exist.
- 🟡 Direct mutation of SWR data: `t.priority = val` mutates cached immutable data.
- 🟡 `<TableRow>` styled with `absolute` + `transform: translateY()` inside `<tbody>` — may break in Safari.
- 🟡 No SWR cache invalidation after inline edits; sorting won't reposition edited rows.

#### Inline Editing (`components/tasks/editable-cell.tsx`)
| Requirement | Status |
|---|---|
| Optimistic UI | ✅ Yes |
| Debounced sync (500ms) | ❌ **No debounce — fires immediately on change** |
| Text input support | ❌ **Select dropdown only** |
| Date/number support | ❌ **Not implemented** |
| Error toast on revert | ❌ **Silently snaps back** |

**Usage:** Only in admin tasks table (priority + status columns). Team tasks and all client tables are static.

#### Kanban Board (`components/tasks/kanban-board.tsx`)
| Requirement | Status |
|---|---|
| Board exists | ✅ Yes |
| Drag-and-drop status changes | ✅ Yes (cross-column drops work) |
| Drag-and-drop reordering | ❌ **Broken — snaps back to original position** |
| Keyboard sensor | ⚠️ Present but non-functional (no reorder state) |
| Default view | ❌ **Default is `list`; plan required `board`** |
| Team tasks | ❌ **No Kanban view at all** |

**Issues:**
- `any` types everywhere (`tasks: any[]`, `column: any`, `task: any`).
- No `onReorder` callback prop.
- `@dnd-kit` uses `PointerSensor` only — not optimized for mobile touch (may conflict with native scroll).

---

### Sprint E: Mobile & Polish — Hovercards, Gestures, Progressive Disclosure, RLS

#### Hovercards
| Requirement | Status |
|---|---|
| Radix HoverCard primitive | ❌ **Not installed; no component exists** |
| CSS hover previews on task links | ❌ **No implementation** |
| CSS hover previews on client links | ❌ **No implementation** |

**Result:** 0% implemented.

#### Mobile Gestures
| Feature | Status |
|---|---|
| Bottom nav (portal) | ✅ Yes |
| Bottom nav (team/admin) | ✅ Yes (with "More" bottom sheet) |
| Mobile hamburger drawer | ✅ Yes |
| Mobile header | ✅ Yes |
| Content padding for bottom nav | ✅ Yes |
| Swipe-to-action | ❌ **Missing** |
| Pull-to-refresh | ❌ **Missing** |
| Floating Action Button (FAB) | ❌ **Missing** |
| Bottom sheets (creation flows) | ❌ **Missing (only "More" nav drawer)** |

#### Progressive Disclosure
| Form | "4 fields + More options"? |
|---|---|
| `new-task-dialog.tsx` | ❌ **All ~10 fields visible at once** |
| `client-form.tsx` | ❌ **All ~13 fields visible at once** |
| `client-create-form.tsx` | ❌ **All sections visible at once** |
| `bizlens/input-form.tsx` | ❌ **Tabs organize fields; not progressive disclosure** |
| `sub-service-dialog.tsx` | ✅ **Yes — `showAdvanced` toggle** |

**Result:** Only 1 of ~15 forms uses progressive disclosure.

#### RLS View Testing
| Requirement | Status |
|---|---|
| `v_unified_inbox` SQL view | ❌ **Does not exist** |
| `SECURITY INVOKER` | ❌ **Does not exist in any SQL file** |
| `all_work_items` view tested | ❌ **View exists but is dead code; never referenced in app/lib** |

**Issues in `db/schema-all-work-items.sql`:**
- No `SECURITY INVOKER` — runs with owner privileges; RLS may be bypassed.
- Missing `is_deleted` filter on `clients` join — soft-deleted clients surface with null names.
- Missing `is_deleted` filter on `compliance_calendar_events`.
- Migration stub `2026-06-01-missing-indexes-and-constraints.sql` references fixing `all_work_items` but contains **no actual SQL**.

---

## Schema & Database Audit

| Metric | Count |
|---|---|
| Tables in `schema.sql` | 46 |
| Tables in `schema-additions.sql` | 9 |
| RLS policies in `rls-additive.sql` | 50 |
| Migrations | 24 |
| `v_unified_inbox` view | ❌ **0** |
| `all_work_items` view references in app/lib | ❌ **0** |

**Observations:**
- Schema is generally consistent between `schema.sql` and `schema-additions.sql`.
- No drift detected between schema files and migrations for core tables.
- `all_work_items` view is orphaned dead code with security risks.

---

## Build, TypeScript & Code Quality Audit

| Check | Result |
|---|---|
| `npm run build` | ❌ **FAILS** (webpack errors from missing `'use client'`) |
| `npx tsc --noEmit` | ❌ **5 errors** |
| `npm run lint` | ❌ **ESLint not installed** |
| `as any` casts in app/components/lib | 423 |
| `console.log` leaks | ✅ **0 found** |

**TypeScript Errors:**
1. `app/admin/page.tsx(73,24): Cannot find name 'attendanceToday'`
2. `app/admin/page.tsx(74,24): Cannot find name 'attendanceToday'`
3. `app/admin/page.tsx(75,21): Cannot find name 'teamMembers'`
4. `app/admin/tasks/tasks-table.tsx(15,78): Module '"@/lib/actions/tasks"' has no exported member 'fetchTasksPageAction'`
5. `app/admin/tasks/tasks-table.tsx(118,25): Cannot find name 'isLoading'`

---

## Security & Architecture Audit

| Check | Status |
|---|---|
| Three-layer architecture (Actions → Services → Repositories) | 🟡 **Violated in `app/admin/page.tsx`** — direct Supabase queries inline |
| Capability checks in shortcuts | ❌ **Missing** — `c` shortcut bypasses capabilities |
| Auto-save user isolation | ❌ **Missing** — drafts leak across user sessions |
| Dock capability check | ⚠️ **Commented out** in `lib/actions/dock-data.ts` |
| RLS on views | ❌ **`all_work_items` has no SECURITY INVOKER** |
| Service-role key isolation | ✅ **Correct** — only in cron/webhooks/scripts |
| Cron secret validation | ✅ **Present** in all cron routes |

---

## Fix Priority Matrix

### P0 — Deploy Blockers (Fix Today)
| # | Issue | File | Fix |
|---|---|---|---|
| 1 | Add `'use client'` | `app/admin/tasks/tasks-table.tsx` | Line 1 |
| 2 | Destructure missing vars | `app/admin/page.tsx` | Lines 55–69 |
| 3 | Implement missing export | `lib/actions/tasks.ts` | Add `fetchTasksPageAction` |
| 4 | Declare `isLoading` | `app/admin/tasks/tasks-table.tsx` | Destructure from `useSWRInfinite` |

### P1 — High Impact (Fix This Week)
| # | Issue | File | Fix |
|---|---|---|---|
| 5 | Namespace auto-save keys | `lib/hooks/use-auto-save.ts` | Include `userId` in localStorage key |
| 6 | Fix rehydration merge order | `lib/hooks/use-auto-save.ts` | `{ ...parsed, ...prev }` or predicate |
| 7 | Remove or wire up dock triggers | All tables/cards | Replace `<Link>` with `push()` or delete dock |
| 8 | Decide on @modal vs dock | `app/team/@modal/`, `app/portal/@modal/` | Remove @modal if committing to dock |
| 9 | Add DockProvider to team/portal | `app/team/layout.tsx`, `app/portal/layout.tsx` | Wrap children |
| 10 | Fix command palette slash commands | `components/shell/command-palette.tsx` | Implement actual creation flow |
| 11 | Replace hardcoded revenue | `app/admin/page.tsx` | Real query or remove card |
| 12 | Move inline Supabase calls to actions | `app/admin/page.tsx` | Create `lib/actions/dashboard.ts` |

### P2 — Medium Impact (Fix Next Sprint)
| # | Issue | File | Fix |
|---|---|---|---|
| 13 | Add debounce to EditableCell | `components/tasks/editable-cell.tsx` | `setTimeout` 500ms or `useDeferredValue` |
| 14 | Fix SWR data mutation | `app/admin/tasks/tasks-table.tsx` | Use `mutate()` instead of direct assignment |
| 15 | Set Kanban as default | `app/admin/tasks/tasks-table.tsx` | `useState<'list' \| 'board'>('board')` |
| 16 | Fix Kanban reordering | `components/tasks/kanban-board.tsx` | Add `onReorder` state + callback |
| 17 | Add `useSWRInfinite` to team tasks | `app/team/tasks/tasks-table-client.tsx` | Port admin pattern |
| 18 | Gate shortcuts by capability | `components/sophistication/shortcuts-help.tsx` | Filter by `filterNavByCapabilities` |
| 19 | Implement dock data for clients/notices/queries | `lib/actions/dock-data.ts` | Add fetchers + renderers |
| 20 | Add progressive disclosure to new-task-dialog | `components/tasks/new-task-dialog.tsx` | Collapse optional fields behind toggle |

### P3 — Polish (Fix When Convenient)
| # | Issue | File | Fix |
|---|---|---|---|
| 21 | Add hovercards | New component + CSS | Install `@radix-ui/react-hover-card` |
| 22 | Add mobile gestures | Global hooks | `react-swipeable` or custom touch handlers |
| 23 | Create `v_unified_inbox` view | `db/schema-unified-inbox.sql` | `SECURITY INVOKER` + RLS tests |
| 24 | Fix `all_work_items` security | `db/schema-all-work-items.sql` | Add `is_deleted` filters + `SECURITY INVOKER` |
| 25 | Reduce `as any` casts | Entire codebase | Target < 50 |
| 26 | Install ESLint | `package.json` | `npm install --save-dev eslint` |
| 27 | Remove dead imports | `app/admin/page.tsx` | `ActivityFeed`, `HealthScoreCard`, `AdminQuickActions` |

---

## Conclusion

The sprint achieved **significant partial progress** on the UX revolution, but it is **not complete and not deployable**. The most critical gap is that **the build fails** — without fixing the 4 P0 blockers, nothing can ship.

Beyond the blockers, the sprint suffers from a **completion imbalance**: infrastructure was built (dock shell, virtual scroll, dnd-kit, auto-save hook) but **wiring was not finished** (no triggers, no consumers, no debounce, no default view change). This creates the illusion of progress while leaving the user-facing experience largely unchanged.

**My recommendation:**
1. Fix the 4 P0 blockers immediately (1–2 hours of work).
2. Run `npm run build` and `npx tsc --noEmit` until clean.
3. Execute the P1 fixes before calling the sprint "done."
4. Accept that hovercards, unified inbox, and mobile gestures are **not implemented** and move them to a follow-up sprint.

Do you want me to fix the P0 blockers right now?
