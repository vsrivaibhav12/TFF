# TFF Practice Management — Comprehensive UX & Feature Audit
**Date:** 13 May 2026
**Scope:** Staff workspace, navigation, compliance, filters, charts, task lifecycle, document removal
**Status:** Awaiting confirmation before implementation

---

## 1. Executive Summary

The Fiscal Fulcrum is architecturally solid (three-layer architecture, RLS, capability gates, 125 passing tests), but the **staff-facing workspace has accumulated complexity** that obscures its core purpose as a Practice Management System. The client portal is in decent shape; the **staff experience needs simplification, consolidation, and visual analytics**.

Below is a point-by-point audit against your requirements, with **Current State → Gap → Recommended Fix** for each.

---

## 2. Attendance, Leave & Permissions

### 2.1 Your Requirement
> "Attendance logging should be simple for everyone: Punch in (morning). Once punched in, option to punch out. Option to apply for permission. Leave application should be default in the any staff page. Leave and permission modules should all be within the attendance module."

### 2.2 Current State
| Feature | Status | Files |
|---------|--------|-------|
| Punch in / out | Exists but geo-gated | `app/team/attendance/check-in-out.tsx` |
| Monthly table view | Exists | `app/team/attendance/page.tsx` |
| Manual entry (override) | Exists, admin-only | `app/team/attendance/manual-entry-form.tsx` |
| Leave request | Separate page `/team/leave` | `app/team/leave/leave-form.tsx` |
| Permission / OD request | **Does not exist** | Only a `permission` status in manual attendance dropdown |

**Problems found:**
- Leave is a **separate page**, not integrated into the attendance view.
- There is **no permission/OD workflow** — staff must ask admin to manually mark attendance as "permission".
- No leave balance/entitlement display.
- Attendance page shows a full monthly table first; the punch button is secondary.

### 2.3 Recommended Fix
**Consolidate into a single "My Attendance" hub:**

```
┌─────────────────────────────────────┐
│  [🟢 Mark Attendance]  (primary)   │
│       → Punch In  →  Punch Out      │
├─────────────────────────────────────┤
│  Leave Balance: 12 days remaining   │
│  [Apply for Leave]  [Apply for OD]  │
├─────────────────────────────────────┤
│  This month's log (collapsible)     │
│  Date | Status | In | Out | Hours   │
└─────────────────────────────────────┘
```

1. **Move `/team/leave` into `/team/attendance`** as a tab or section.
2. **Create a Permission/OD request flow** (request → manager approval → auto-mark attendance) similar to leave.
3. **Swap priority:** Punch card should be the hero element; the monthly table should be secondary/collapsible.
4. **Add leave balance display** (read from `users_profile.paid_leaves_per_month` minus approved leave days).

---

## 3. Task Creation Gating

### 3.1 Your Requirement
> "Only those with powers should have task creation enabled."

### 3.2 Current State
✅ **Already correctly implemented.**
- `createTaskAction` gates on `requireCapability(me, 'tasks.create')`.
- Admins implicitly hold it; team members must be granted it via `staff_capabilities`.
- The "New task" button is inside a capability-gated dialog.

### 3.3 Recommended Fix
No code change needed. **Only UX polish:** ensure the "New task" button is completely hidden (not disabled) for users without `tasks.create`.

---

## 4. Document Feature Removal

### 4.1 Your Requirement
> "This document feature can be removed from the entire tool. I think it is redundant."

### 4.2 Current State
Three interrelated subsystems exist:
1. **Document Vault** (`/team/documents`, `/admin/documents`, `/portal/documents`) — firm-wide file archive.
2. **Task Document Requests** (`document_requests` table) — per-task client checklists that auto-block/unblock tasks.
3. **Document Request Templates** (`sub_service_document_request_templates`) — auto-seed requests on task creation.

### 4.3 Blast Radius (Critical)
Removing documents is **not a simple UI deletion**. The strongest coupling is to **task lifecycle management**:

- `createDocumentRequestAction` calls `setTaskBlockedOnClient(taskId, true)`.
- `fulfillDocumentRequestAction` calls `reconcileTaskBlock(taskId)`, which auto-clears `tasks.is_blocked_on_client` when all required requests are fulfilled.
- **Without document requests, the auto-block/unblock mechanism disappears.**

**Decision needed from you:**
> After removing documents, should `is_blocked_on_client` become **purely manual** (staff toggles it), or do you want a **replacement trigger** (e.g., a simple "Waiting on client" toggle with a note)?

### 4.4 Recommended Fix (Pending Your Call)
If you confirm removal, the implementation plan is:
- **Delete:** 7 pages, 2 components, 3 action files, 2 repository files.
- **Modify:** Task detail pages (remove DocumentRequestsPanel), all nav layouts, capabilities list, portal modules, settings UI, shortcuts, schema/SQL.
- **Preserve:** `setTaskBlockedOnClient` in `task-service.ts` (make it manually toggled only).

---

## 5. Staff Dashboard Simplification

### 5.1 Your Requirement
> "I do not want so many complications on their dashboard. It should be very simple: How many tasks assigned to them, out of them how many completed, how many pending, how many beyond due date. Simple buttons: Mark attendance, Update Work done."

### 5.2 Current State
`app/team/page.tsx` currently shows:
- 4 metric cards (Pending, In-progress, Completed, Due this week)
- **Compliance calendar** (left, 2/3 width) — GST/TDS/IT filings, notices, hearings, DSC expiries for next 60 days
- **My Tasks** (right, 1/3) — top 5 tasks
- **My Clients** (bottom) — up to 6 client cards

**Problems found:**
- The compliance calendar dominates the screen with filing entries like `GSTR3B_M undefined/undefined` (data quality issues visible in your screenshot).
- No clear "Overdue tasks" count.
- No quick-action buttons for attendance or work-done.
- Drill-down is weak: client names are not always links; task detail lacks links back to client.

### 5.3 Recommended Fix
**Redesign `/team` (staff home) as a clean command centre:**

```
┌─────────────────────────────────────────────────────────────┐
│  Good morning, [Name]        [Mark Attendance] [Log Work]   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Assigned │ │ Pending  │ │Completed │ │   Overdue    │  │
│  │   24     │ │   12     │ │   45     │ │   3 🔴      │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  My Tasks (due soon)              [View all →]              │
│  • Task #1024 — GST GSTR-3B — Due today                     │
│  • Task #1025 — TDS Q1 — Due tomorrow                       │
├─────────────────────────────────────────────────────────────┤
│  My Clients                       [View all →]              │
│  [Acme Corp] [Beta Ltd] [Gamma LLP] ...                     │
├─────────────────────────────────────────────────────────────┤
│  Quick Links                                                │
│  [Attendance] [Leave] [Queries] [Notices]                   │
└─────────────────────────────────────────────────────────────┘
```

1. **Remove the compliance calendar widget** from the staff dashboard entirely.
2. **Add an "Overdue" metric card** (tasks where `due_date < today && status != 'completed'`).
3. **Add sticky quick-action buttons** for "Mark attendance" and "Log work done".
4. **Make every entity clickable:** task → task detail; client → client detail; notice → notice detail.
5. **Move compliance calendar** to its own dedicated page (see §7).

---

## 6. Navigation, Sidebar & Sign-Out

### 6.1 Your Requirements
> "Sign out should be somewhere on the top right corner. Left side panel should be static. It should not be moving along with screen scroll. Back buttons wherever possible."

### 6.2 Current State
| Requirement | Current State |
|-------------|---------------|
| Sign-out top-right | ❌ Sign-out is **bottom of sidebar** in a user profile card |
| Static sidebar | ⚠️ Sidebar is fixed-width flex item, but the **nav section scrolls internally** if items exceed viewport. Logo and user card are sticky, but the whole page layout scrolls together. |
| Back buttons | ⚠️ Present on **some** detail pages (admin clients, admin tasks, team clients) but **not all**. No back button on team task detail. No cross-entity links (e.g., task → client). |

### 6.3 Recommended Fix

**Sidebar:**
- Make the sidebar `position: fixed; left: 0; top: 0; bottom: 0` with `overflow-y: auto`.
- The main content area should have `margin-left: 16rem` (w-64).
- This ensures the sidebar never moves with page scroll.

**Sign-out:**
- Move sign-out to the **desktop top bar** (right side, next to Notifications bell).
- Keep a compact user avatar dropdown: `[Avatar ▼] → Profile | Sign out`.
- On mobile, keep sign-out at the bottom of the drawer (acceptable there).

**Back buttons & drill-down:**
- Add a **universal back button pattern** to all detail pages:
  - `app/team/tasks/[id]/page.tsx` — missing back link
  - `app/team/notices/[id]/page.tsx` — missing (if it exists)
  - `app/team/hearings/[id]/page.tsx` — missing
- Add **cross-entity breadcrumbs** on detail pages:
  - Task detail: `Tasks > [Client Name] > [Task Title]` — where `[Client Name]` links to client detail.
  - Notice detail: `Notices > [Client Name] > [Notice Number]`

---

## 7. Compliance Calendar Redesign

### 7.1 Your Requirement
> "Do we need this compliance toggle on the left side of the screen? The compliance dashboard can simply be one screen: Task wise — GST, IT, TDS etc. How many tasks created by period, option to set compliance due date for each one, how many completed, and then how many on time, how many delayed, etc."

### 7.2 Current State
- Admin compliance hub (`/admin/compliance`) uses **top tabs**: Upcoming, Health, Calendar, Notices, Hearings.
- There is **no left-side toggle** in the current code (your screenshot may be from an older version or a different view).
- The staff dashboard shows a cluttered calendar list of filings.

### 7.3 Recommended Fix
**Create a single "Compliance Dashboard" page** (replacing the tabbed hub):

```
┌─────────────────────────────────────────────────────────────┐
│  Compliance Overview                        [FY 2025-26 ▼]  │
├─────────────────────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │ Total  │ │ Filed  │ │ Pending│ │ Overdue│ │Delayed │   │
│  │  120   │ │  85    │ │  25    │ │   7    │ │   3    │   │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Service-wise Breakdown (Bar Chart)                         │
│  GST ████████████████████ 45                                │
│  TDS ██████████████ 30                                      │
│  IT  ██████████ 20                                          │
├─────────────────────────────────────────────────────────────┤
│  Period-wise Task Table                                     │
│  Period   │ GST │ TDS │ IT  │ Total │ Filed │ On Time │ Delay│
│  May 2026 │ 12  │  4  │  2  │  18   │  15   │   14    │  1   │
├─────────────────────────────────────────────────────────────┤
│  [Set Due Dates] [Generate Tasks] [Export]                  │
└─────────────────────────────────────────────────────────────┘
```

1. **Remove the compliance calendar widget from the staff dashboard** entirely.
2. **Consolidate admin compliance** into one analytics screen with:
   - Aggregate counters (total, filed, pending, overdue, delayed).
   - Service-wise bar chart (ECharts).
   - Period-wise table with inline "Set due date" actions.
   - "On time" = `completed_date <= due_date`; "Delayed" = `completed_date > due_date`.
3. Staff should see a **simplified version** (only their assigned clients' compliance) if needed, or none at all.

---

## 8. Filters

### 8.1 Your Requirement
> "How will I filter clients pertaining only to a group? How will I filter out tasks only GST related? I do not see filters anywhere."

### 8.2 Current State
| Page | Filters | Persistence |
|------|---------|-------------|
| Team tasks | Status pills + Priority pills | URL query params |
| Admin tasks | Search + Status dropdown + Priority dropdown + Assignee dropdown | **Client state only — lost on refresh** |
| Team clients | Search + Column sort | Client state |
| Admin clients | **None** — plain list with SavedViewsBar only | — |
| Notices | **None** | — |
| Hearings | **None** | — |
| Queries | Status pills | URL query params |

### 8.3 Recommended Fix
**Add filter bars to every list view:**

1. **Admin / Team Clients:**
   - Filter by: Group (dropdown), Lifecycle stage (multi-select), City (search), Portal enabled (toggle).
   - Search: Business name, PAN, GSTIN.

2. **Admin / Team Tasks:**
   - Filter by: Service kind (GST/TDS/IT/etc.), Sub-service, Client (dropdown), Assignee (dropdown), Status (multi-select), Priority (multi-select), Due date range.
   - **Sync all to URL query params** so SavedViewsBar can capture them.

3. **Notices / Hearings:**
   - Filter by: Client, Status, Type, Date range.

4. **SavedViewsBar:**
   - Add it to **admin tasks** (currently missing).
   - Ensure it captures both URL params and key client-state filters.

---

## 9. Charts & Analytics

### 9.1 Your Requirement
> "We discussed charts and Apache ECharts. But we do not have charts anywhere. I fail to see the reason why."

### 9.2 Current State
**Charts DO exist, but they are underutilized and hidden in module-specific pages:**

| Chart | Location | Library |
|-------|----------|---------|
| Compliance health donut | Admin dashboard + compliance health | Recharts |
| GST turnover/output tax/ITC | `/admin/gst/[clientId]` | ECharts |
| BizLens trends | `/admin/clients/[id]/bizlens` | ECharts |
| vCFO metrics | `/admin/vcfo/[clientId]` | ECharts |

**Missing:**
- No charts on the **staff dashboard**.
- No **firm-wide trend charts** (e.g., task completion rate over time).
- No **task analytics** (tasks created vs completed per month, average turnaround time).
- No **client analytics** (revenue by client group, churn pipeline).

### 9.3 Recommended Fix
**Add charts to three key areas:**

1. **Staff Dashboard:**
   - Mini donut: Task status breakdown (pending / in-progress / completed / overdue).
   - Sparkline: Tasks completed this week vs last week.

2. **Compliance Dashboard (new):**
   - Stacked bar: Filings by service kind per month.
   - Line chart: On-time filing % trend over 12 months.

3. **Task Analytics Page (new or admin dashboard):**
   - Bar chart: Tasks created vs completed per month.
   - Line chart: Average days from `created_date` to `completed_date`.
   - Pie chart: Tasks by service kind (GST / TDS / IT / etc.).
   - Table: Top 10 delayed tasks.

---

## 10. Task Date Logging & Insights

### 10.1 Your Requirement
> "For all tasks, we need to log: Task creation date, Task Due date, Task Completion date. This should give us good insights."

### 10.2 Current State
**Schema already has all three dates:**
- `created_date` (DATE, default CURRENT_DATE)
- `due_date` (DATE, NOT NULL)
- `completed_date` (DATE, nullable)
- `started_date` (DATE, nullable)

**But they are barely surfaced in the UI:**
- Task detail shows **Due Date** only.
- `created_date`, `started_date`, `completed_date` are **not displayed** on task detail pages.
- No analytics derived from the interval between these dates.

### 10.3 Recommended Fix
1. **Task Detail Sidebar:** Add a "Timeline" mini-card:
   ```
   Created:  01 May 2026
   Started:  05 May 2026
   Due:      20 May 2026
   Completed: —
   Turnaround: — (or "4 days" if completed)
   ```

2. **Auto-populate dates:**
   - `started_date` → auto-set when status transitions from `pending` → `in_progress`.
   - `completed_date` → auto-set when status transitions to `completed`.

3. **Insights derived:**
   - Average turnaround time per service kind.
   - % of tasks completed before due date.
   - % of tasks started within 2 days of creation.

---

## 11. Back Buttons & Drill-Down

### 11.1 Your Requirement
> "We go into a menu and sub-menu item, we should definitely have back buttons — back to (menu) item, back to home page."

### 11.2 Current State
- Back links exist on **some** detail pages (admin clients, admin tasks, team clients).
- **Missing on:** team task detail, team notices, team hearings, portal pages.
- Breadcrumbs exist in AppShell top bar but are **auto-generated from URL** — they don't link to intermediate entities (e.g., task detail breadcrumb is `Team > tasks > 123`, not `Tasks > Acme Corp > GSTR-3B`).

### 11.3 Recommended Fix
1. **Add back button to every detail page** that lacks one.
2. **Improve breadcrumbs** to show entity names, not IDs:
   - `/team/tasks/123` → `My Workspace > Tasks > Acme Corp > GSTR-3B May 2026`
   - Each intermediate segment should be a link.
3. **Add "Back to [Client]"** on task detail when the user came from a client page (use `document.referrer` or pass `?from=client` in URL).

---

## 12. Responsiveness & Intuitiveness

### 12.1 Current State
- Mobile bottom nav exists for **client portal only** (5 tabs).
- Staff mobile view uses a **hamburger drawer** — no bottom nav.
- Tables do not horizontally scroll well on small screens.
- Some pages (admin reports) are desktop-only and break on mobile.

### 12.2 Recommended Fix
1. **Staff mobile:** Add a bottom nav (4 tabs: Home, Tasks, Clients, More) — consistent with client portal.
2. **Tables:** Wrap all tables in `overflow-x-auto` with `min-w-full`.
3. **Card grids:** Use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` instead of fixed multi-column grids.
4. **Touch targets:** Ensure all buttons are at least 44×44px on mobile.

---

## 13. Implementation Roadmap (Proposed)

If you confirm, I propose this phased rollout:

### Phase 1: Foundation (Week 1)
- [ ] Fix sidebar to `position: fixed` + main content margin.
- [ ] Move sign-out to top-right avatar dropdown.
- [ ] Add back buttons to all detail pages.
- [ ] Add cross-entity links (task → client, notice → client).

### Phase 2: Dashboard & Attendance (Week 1–2)
- [ ] Redesign `/team` staff dashboard (simplified metrics + quick actions).
- [ ] Consolidate leave into `/team/attendance`.
- [ ] Build Permission/OD request flow.
- [ ] Add leave balance display.

### Phase 3: Compliance & Filters (Week 2)
- [ ] Remove compliance calendar widget from staff dashboard.
- [ ] Build unified compliance dashboard (admin + team views).
- [ ] Add filters to clients, tasks, notices, hearings tables.
- [ ] Add SavedViewsBar to admin tasks.

### Phase 4: Charts & Analytics (Week 3)
- [ ] Add ECharts to staff dashboard (task breakdown donut).
- [ ] Build task analytics page (turnaround, on-time %, service-wise bars).
- [ ] Add compliance trend charts.

### Phase 5: Task Lifecycle Polish (Week 3)
- [ ] Surface `created_date`, `started_date`, `completed_date` in task detail.
- [ ] Auto-set `started_date` and `completed_date` on status transitions.
- [ ] Add turnaround time calculation.

### Phase 6: Document Removal (Week 4)
- [ ] Remove all document pages, components, actions, repositories.
- [ ] Make `is_blocked_on_client` purely manual (toggle + note).
- [ ] Clean up nav, capabilities, portal modules, schema.

---

## 14. Questions for Your Confirmation

Before I begin implementation, please confirm or comment on:

1. **Document removal:** Should `is_blocked_on_client` become purely manual after documents are removed, or do you want a simpler replacement (e.g., a "Waiting on client" toggle with a text note)?

2. **Compliance on staff dashboard:** Should staff see **any** compliance summary at all, or should compliance be **100% removed** from their view and live only under admin?

3. **Charts priority:** Which chart is most important to you first — (a) staff dashboard mini-charts, (b) compliance dashboard charts, or (c) task analytics charts?

4. **Permission/OD workflow:** Should permission requests route to the user's `manager_id` (from `users_profile`) for approval, or to all admins?

5. **Mobile staff experience:** Should staff get a **bottom tab nav** on mobile (like the client portal), or keep the hamburger drawer?

6. **Filters:** Should I start with **client filters** (group, stage, city) or **task filters** (service kind, sub-service, date range) first?

---

*Awaiting your confirmation and answers to the above before proceeding with implementation.*
