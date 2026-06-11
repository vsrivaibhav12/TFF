# UX Revolution — Current Implementation Plan
> Based on actual codebase state after reset (2026-06-02)

## State of the Codebase

### ✅ Already Built (Previous Sessions)
- **ContextRail + ContextPanel** — persistent 72px rail + 280px contextual panel in AppShell
- **Universal Detail Dock** — split-context pattern, URL sync, supports task/client/notice/query
- **DockProvider** — in all layouts (admin, team, portal)
- **Auto-save Hook** — `useAutoSaveState` with TTL, user namespacing, merge order fix
- **Keyboard Shortcuts Hook** — `useGlobalShortcuts` with focus guards
- **EditableCell** — inline editing with optimistic UI, 500ms debounce
- **KanbanBoard** — dnd-kit with touch sensor, local reorder state
- **HoverCards** — `TaskHoverCard`, `ClientHoverCard`, `NoticeHoverCard` components
- **Mobile Components** — `MobileFab`, `PullToRefresh`, `SwipeableRow`, `BottomSheet`
- **Command Palette** — Cmd+K search with slash commands
- **Client 360°** — vertically scrolling client detail with sticky header
- **Admin Mission Control** — 4-zone dashboard
- **Smart Tables** — virtual scroll with `@tanstack/react-virtual`
- **Design System** — zinc+teal, tabular-nums, empty states, no shadows

### ❌ Not Wired Up (Built but Disconnected)
- `useGlobalShortcuts` — hook exists, **zero consumers**
- `useAutoSaveState` — hook exists, **not used in any form**
- `TaskHoverCard` — component exists, **not used in any table/link**
- `ClientHoverCard` — component exists, **not used in any table/link**
- `NoticeHoverCard` — component exists, **not used in any table/link**
- `PullToRefresh` — component exists, **not used in any list**
- `SwipeableRow` — component exists, **not used in any list**
- `BottomSheet` — component exists, **not used in any mobile flow**
- `DockLink` — helper exists, **not used consistently**

### ❌ Missing Entirely
- `app/admin/inbox/page.tsx` — unified inbox page
- `v_unified_inbox` view — SQL exists but not applied/verified
- Keyboard shortcuts for j/k/e/a navigation
- Progressive disclosure in forms (new-task-dialog, client-form, bizlens input)
- Mobile bottom sheets for creation flows

---

## Execution Plan

### Phase 1: Wire Up Infrastructure (High Impact, Low Risk)
1. **Keyboard Shortcuts** — Add `useGlobalShortcuts` to AppShell; implement j/k/e/a/c/?
2. **Auto-Save** — Wire into `new-task-dialog.tsx`
3. **HoverCards** — Wrap task/client/notice links in tables with hovercards
4. **DockLink** — Replace plain `<Link>` in tables with `DockLink` for consistent dock behavior

### Phase 2: Mobile & Polish
5. **PullToRefresh** — Wrap task/client/query lists
6. **SwipeableRow** — Add to mobile task/client rows
7. **BottomSheet** — Wire into mobile creation flows
8. **Progressive Disclosure** — Collapse optional fields in forms

### Phase 3: Missing Features
9. **Unified Inbox** — Create page + wire SQL view
10. **Command Palette** — Fix /task and /query slash commands
11. **Kanban Default** — Change default view to board

### Phase 4: QA & Tests
12. **Per-screen smoke tests** (P6 from master fix list)
13. **Build verification**
