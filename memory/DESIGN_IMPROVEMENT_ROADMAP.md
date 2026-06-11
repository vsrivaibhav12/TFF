# Design Improvement Roadmap — The Fiscal Fulcrum Portal

> Written for: The business owner
> Based on: Current codebase audit vs. design-proposals folder
> Date: 2026-06-03

---

## Part 1: Designer Perspective — How to Make This 10x Better

I have read every design proposal, every mockup HTML file, and every line of the current implementation. Here is what I would do if I were the designer on this project.

### The Core Insight: The Table IS the Product

Your team spends 80% of their day looking at tables — tasks, clients, notices, queries. The current tables are functional but visually dead. They look like database dumps, not workspaces. Every row should answer three questions in under one second:

1. **What is this?** (Title + type)
2. **How urgent is it?** (Priority + due date + status)
3. **Who owns it?** (Assignee + client)

The current table buries urgency in badges. The design proposals treat urgency as the *primary* visual signal.

---

### 1. Tags & Labels: Surface Them, Don't Hide Them

**Current state:** Labels exist in the database, are fetched via `enrichTasksWithLabels()`, but are rendered in a tiny, cramped line under the task title — only if they exist. Most rows show nothing.

**What I would do:**
- **Make labels a first-class column**, not an afterthought under the title
- Use **small, rounded pills** with the label's own color (already stored in `color_hex`)
- Cap at 3 visible labels + a "+2" overflow indicator
- Allow **inline filtering**: clicking a label instantly filters the table to that label

**Why this matters:** A "GST-Filing" label tells a staff member more in 0.1 seconds than reading the full task title.

---

### 2. Progress at a Glance: Tiny, Inline, Always Visible

**Current state:** `enrichTasksWithProgress()` exists in the repository layer. It calculates `progress_pct` from task steps. But the admin tasks page never calls it. The `TaskCard` component (used in Kanban) accepts `progress_pct` but the table ignores it entirely.

**Your suggestion is spot-on.** I would add a **micro progress indicator** directly in the task row:

- A **thin horizontal bar** (4px tall, 40px wide) next to the status badge
- Color-coded: teal for on-track, amber for stalled, red for overdue + low progress
- Show the percentage number only on hover (tooltip)
- For tasks with **zero steps**, show "—" instead of an empty bar (avoids visual noise)

**Example row snippet:**
```
[Checkbox]  T-1042  File GSTR-3B for Swadeshi Bazaar
            [GST-Filing] [Urgent]     |███████░░░| 70%    Due today   Priya
```

**Why this matters:** A manager scanning 50 tasks can instantly spot which ones are "almost done" (green, 90%+) vs "barely started" (red, 10%, due tomorrow).

---

### 3. Row Design: From Database Row to Actionable Card

**Current state:** Standard HTML `<TableRow>` with uniform padding, flat borders, no depth. Every row looks identical.

**What I would do:**

**A. Zebra striping is dead. Use subtle card elevation instead.**
- Each row is a **rounded card** (`rounded-xl`, `bg-white`, `border border-zinc-100`)
- On hover: `border-teal-200`, `shadow-sm`, `translateY(-1px)` — it *lifts*
- Gap between rows: `gap-2` (not touching — breathing room)

**B. Left-border status indicator.**
- A **3px vertical bar** on the left edge of each row:
  - Red = overdue
  - Amber = due today / this week
  - Teal = on track
  - Zinc = completed / no rush
- This is the first thing the eye catches. No reading required.

**C. Avatar + initials for assignee.**
- Replace the text "Priya S." with a **small circular avatar** (or initials badge if no photo)
- Hover shows full name + email
- Click filters table to that assignee

---

### 4. Color as Information, Not Decoration

**Current state:** The `Badge` component uses colors (`bg-teal-50`, `text-teal-700`, etc.) but the palette is inconsistent across the app. Priority badges are small. Status badges are large. Due dates are plain text.

**What I would do:**

Establish a **single, strict color grammar**:

| Signal | Color | Usage |
|--------|-------|-------|
| Overdue / Critical | Red-500 | Left border, due date text, alert icon |
| Due today / Warning | Amber-500 | Left border, due date text |
| On track / Normal | Teal-500 | Left border, progress bar |
| Completed / Done | Zinc-400 | Muted text, no border |
| Blocked / Stuck | Purple-500 | Status badge only |

**Rules:**
- Never use more than ONE color signal per row (prevents visual chaos)
- The left border carries the urgency signal
- Badges carry the status signal
- Text carries the metadata

---

### 5. The Dock: Redesign for 480px, Not Resize for 480px

**Current state:** The `ClientDetailShell` has `lg:grid-cols-12` with an 8-column + 4-column layout. Inside the 480px dock, this produces the "rubbish" screenshot you shared.

**What I would do (fundamentally different from the developer's plan):**

The dock is a **summary panel**, not a full-page view. For each entity type:

**Task Dock (already closest to correct):**
- Header: Title, status badge, client link
- Bento grid: Priority | Due date | Period | Assignee | Billable | Verified
- Progress bar (prominent, not hidden)
- Steps checklist (collapsible, not expanded)
- Notes (last 3, expandable)
- Action buttons: Start, Complete, Blocked, Stuck, Reminder
- "Open full page →" link for editing description, custom fields, billing

**Client Dock (needs total rewrite):**
- Header: Business name, PAN, GSTIN, location
- Pulse strip: 4 mini cards (Open tasks / Open notices / Open queries / Compliance score)
- Active work list (compact, 5 items max, each with type icon + status + due)
- Quick actions: "New task", "New notice", "New query" for THIS client
- Team avatars (read-only, not full manager)
- Service tags (read-only pills, not full service manager)
- "Open full profile →" for editing services, team, billing, vault

**The rule:** If an action requires more than 3 form fields, it belongs on the full page, not in the dock.

---

### 6. Dashboard Density: Information, Not Decoration

**Current state:** The admin dashboard has stat cards, a priority list, and notice deadlines. It is functional but flat. Every widget looks like a card with the same shadow and padding.

**What I would do:**

**A. The "Today" list should feel like a triage queue, not a widget.**
- Remove the card wrapper. Make it a full-width list with the left-border urgency indicator.
- Each item should have: Checkbox (mark done) | Title | Client | Due | Owner
- Completed items slide out with a subtle animation.

**B. The stat cards should be smaller and more scannable.**
- Reduce from `p-5` to `p-3`
- Number first (large), label second (small, muted)
- Sparkline mini-chart under each number (7-day trend)
- Clicking a stat filters the relevant page

**C. Add a "This Week" horizontal timeline.**
- A single-row calendar strip showing Mon–Sun
- Dots under each day: teal = filings due, amber = hearings, red = overdue from prior week
- Click a day → jump to that filtered view

---

### 7. Typography Hierarchy: Guide the Eye

**Current state:** Headings are `text-[24px] font-semibold`. Body is `text-sm text-zinc-500`. There are only 2–3 font sizes in use across the entire app.

**What I would do:**

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Page title | 20px | 600 | "Clients", "Tasks" |
| Section header | 13px | 600 | "Today's priorities", "Active work" |
| Card title | 14px | 500 | Task title, client name |
| Body / metadata | 12px | 400 | Due dates, assignee names, labels |
| Caption / badge | 10–11px | 500 | Status badges, counts, monospaced IDs |

**Rules:**
- Use **tabular nums** for ALL numbers (counts, percentages, dates, IDs)
- Use **monospace** for task numbers and PAN/GSTIN
- Never use `text-xs` (10px) for body text — only for badges and captions

---

## Part 2: Concrete Implementation Roadmap

This is what needs to be built, in priority order. Each item is scoped to be implementable in 1–3 days.

### Phase 0: Foundation Fixes (Week 1)

These are non-negotiable before any visual work begins.

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| P0-1 | Fix dock shells for 480px width: remove `lg:grid-cols-12`, force single-column layout with `max-w-full` | `client-detail-shell.tsx`, `task-detail-shell.tsx`, `notice-detail-shell.tsx`, `query-detail-shell.tsx` | 2 days |
| P0-2 | Wire `enrichTasksWithProgress` into admin tasks page | `app/admin/tasks/page.tsx` | 2 hours |
| P0-3 | Wire `enrichTasksWithProgress` into team tasks page | `app/team/tasks/page.tsx` | 2 hours |
| P0-4 | Ensure virtual scroll works on all tables (not just admin tasks) | `clients-table-client.tsx`, `tasks-table-client.tsx` | 1 day |
| P0-5 | Fix ContextualPanel to show module-specific content (recent items, saved views, quick filters) — not full nav list | `contextual-panel.tsx` | 1 day |

### Phase 1: Table Redesign (Week 2)

This is where the visual transformation happens.

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| P1-1 | **Redesign task row:** Card-style row with left-border urgency indicator, avatar for assignee, inline progress bar | `tasks-table.tsx` | 2 days |
| P1-2 | **Surface labels as first-class column:** Render colored pills in their own table cell, cap at 3 + overflow | `tasks-table.tsx`, `tasks-table-client.tsx` | 1 day |
| P1-3 | **Inline progress micro-bar:** 4px height, 40px width, color-coded, tooltip on hover with "% + steps done/total" | New component: `components/ui/progress-micro.tsx` | 4 hours |
| P1-4 | **Redesign client row:** Card-style row with compliance dots as a mini dashboard, engagement count as a badge, group as an editable pill | `clients-table-client.tsx` | 2 days |
| P1-5 | **Hover-reveal row actions:** On hover, show 3-dot menu with Edit / View / Delete (not always-visible buttons) | `tasks-table.tsx`, `clients-table-client.tsx` | 1 day |

### Phase 2: Dashboard Polish (Week 3)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| P2-1 | **Redesign "Today's priorities" as a triage list:** Remove card wrapper, add left-border urgency, checkbox to mark done, inline client/owner | `priority-list.tsx` | 1 day |
| P2-2 | **Add mini sparklines to stat cards:** 7-day trend line under each dashboard number | New component + data query | 2 days |
| P2-3 | **Add "This Week" horizontal timeline strip:** Mon–Sun calendar with dots for filings/hearings/overdue | New component | 1 day |
| P2-4 | **Redesign notice deadline cards:** Smaller, horizontal layout (icon + date pill + title + client), not vertical cards | `app/admin/page.tsx` | 1 day |

### Phase 3: Dock Redesign (Week 4)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| P3-1 | **Task dock — Bento grid metadata:** Compact 2-col grid for Priority, Due, Period, Assignee, Billable, Verified | `task-detail-shell.tsx` | 1 day |
| P3-2 | **Task dock — Inline progress bar:** Prominent horizontal bar showing step completion, clickable to expand steps | `task-detail-shell.tsx` | 4 hours |
| P3-3 | **Client dock — Pulse strip:** 4 mini cards (tasks/notices/queries/compliance) as a horizontal strip | `client-detail-shell.tsx` | 1 day |
| P3-4 | **Client dock — Active work list:** Compact list with type icon, title, status badge, due date — max 5 items | `client-detail-shell.tsx` | 1 day |
| P3-5 | **Client dock — Read-only service tags:** Show services as colored pills, not the full `ClientServiceManager` | `client-detail-shell.tsx` | 4 hours |
| P3-6 | **Client dock — Read-only team avatars:** Show team member initials as a row of avatars, not the full `ClientTeamManager` | `client-detail-shell.tsx` | 4 hours |
| P3-7 | **Add "Open full page →" link to all docks** | All detail shells | 2 hours |

### Phase 4: Forms & Mobile (Week 5)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| P4-1 | **Progressive disclosure in New Task dialog:** Show 4 fields (client, title, due date, assignee). "More options" toggle reveals sub-service, priority, period, billing, template, labels | `new-task-dialog.tsx` | 1 day |
| P4-2 | **Smart defaults in New Task dialog:** Due date = tomorrow, priority = medium, assignee = current user | `new-task-dialog.tsx` | 2 hours |
| P4-3 | **Progressive disclosure in Client form:** Show 5 fields (business name, PAN, GSTIN, contact person, email). "More options" reveals address, portal settings, group, etc. | `client-form.tsx`, `client-create-form.tsx` | 1 day |
| P4-4 | **Mobile: Add pull-to-refresh indicator** to all list pages | Custom hook | 1 day |
| P4-5 | **Mobile: Swipe-to-action** on task rows (right swipe = mark complete, left swipe = snooze) | `swipeable-row.tsx` | 2 days |

### Phase 5: Polish & Consistency (Week 6)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| P5-1 | **Typography audit:** Ensure all pages use the 5-level hierarchy defined above | All pages | 2 days |
| P5-2 | **Color grammar audit:** Apply strict left-border + badge + text color rules consistently | All tables | 2 days |
| P5-3 | **Remove all `stone-*` colors** (should already be done, verify) | Global search | 2 hours |
| P5-4 | **Add `tabular-nums` to every number display** (counts, currency, dates, IDs) | Global search | 1 day |
| P5-5 | **Empty state redesign:** Larger icon (`h-12 w-12`), better copy, clear CTA button | `empty-state.tsx` | 4 hours |

---

## What Is Explicitly NOT in This Roadmap

| Excluded | Reason |
|----------|--------|
| **Kanban as default view** | Per your instruction. List remains default; kanban stays as a toggle. |
| **CSS Grid tables with row expansion** | Too complex for current sprint. Standard HTML tables with card-style rows are sufficient. |
| **Column customization / density toggle** | Nice-to-have. Can be added after core redesign. |
| **Unified inbox page** | Requires `v_unified_inbox` view + new page. Major feature, not a redesign. |
| **AI suggest / natural language command palette** | Feature work, not design polish. |
| **Gallery view for tables** | Nice-to-have. List + Kanban is sufficient. |

---

## Success Criteria

The redesign is successful when:

1. A user can scan 20 task rows and instantly identify which are overdue, which are due today, and which are nearly complete — **without reading a single word of text** (colors, borders, progress bars do the work).
2. The dock opens in under 300ms and requires **zero horizontal scrolling** on a 1920px monitor.
3. The dashboard fits all critical information **above the fold** on a 1440px monitor.
4. Every table row feels like an **actionable card**, not a database record.
5. Labels, progress, and assignee are visible **at a glance** — never hidden behind hover or click.

---

## Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| P0: Foundation | 1 week | Week 1 |
| P1: Table Redesign | 1 week | Week 2 |
| P2: Dashboard Polish | 1 week | Week 3 |
| P3: Dock Redesign | 1 week | Week 4 |
| P4: Forms & Mobile | 1 week | Week 5 |
| P5: Polish & Consistency | 1 week | Week 6 |

**Total: 6 weeks of focused design implementation.**

This assumes one developer working full-time on UI/UX. Infrastructure (virtual scroll, dock state, command palette) is already built — this roadmap is purely visual and interaction design.
