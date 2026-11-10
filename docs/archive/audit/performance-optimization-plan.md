# Performance Optimization Plan

> Date: 2026-05-20  
> Current stack: Next.js 14 App Router, Supabase SSR, Tailwind CSS, shadcn/ui  
> Status: Diagnostic + recommended roadmap

---

## 1. Current Bottlenecks (Diagnosed)

### 1.1 Server-Side Data Fetching

| Issue | Impact | Evidence |
|---|---|---|
| **N+1 queries in page components** | High | `task-detail-shell.tsx` fetches task, steps, activity, notes, workdone, team, CFs, labels — 8+ round trips |
| **No query-level caching** | High | Every page load hits Supabase directly; no Redis/Edge caching |
| **Force-dynamic everywhere** | High | Most pages use `export const dynamic = 'force-dynamic'` disabling Next.js static optimization |
| **Over-fetching in lists** | Medium | `listAccessibleClients` selects 15+ columns; list views rarely need more than 5 |

### 1.2 Client-Side Rendering

| Issue | Impact | Evidence |
|---|---|---|
| **Large bundle size** | High | No code-splitting on route level; all tabs render even when hidden |
| **No virtualization** | Medium | Long client/task lists render every row; 500+ clients = 500+ DOM nodes |
| **Unoptimized images** | Low | No `next/image` usage; raw `<img>` tags likely present |
| **Synchronous state waterfalls** | Medium | `useEffect` chains in `new-task-dialog.tsx` (client → sub-services → templates) |

### 1.3 Database

| Issue | Impact | Evidence |
|---|---|---|
| **Missing indexes on hot paths** | High | `tasks` queries filter by `client_id + status + is_deleted` — composite index needed |
| **No materialized views** | Medium | Dashboard counts (tasks by status, client engagement) computed on every load |
| **RLS policy complexity** | Medium | `tasks_team_view` uses 4 subqueries; evaluate if simpler policies + app-layer filtering is faster |

---

## 2. Optimization Roadmap

### Phase 1: Quick Wins (1–2 days)

#### 2.1.1 Add Strategic Database Indexes

```sql
-- Task list filters (heavily used in /team/tasks, /admin/tasks)
CREATE INDEX idx_tasks_client_status ON tasks(client_id, status, is_deleted) WHERE is_deleted = false;
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to, status) WHERE is_deleted = false;
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE is_deleted = false AND status != 'completed';

-- Activity + notes (task detail page)
CREATE INDEX idx_task_activity_task_created ON task_activity(task_id, created_at DESC);
CREATE INDEX idx_task_notes_task_created ON task_notes(task_id, created_at DESC);

-- Step queries
CREATE INDEX idx_task_steps_task_order ON task_steps(task_id, step_order) WHERE is_deleted = false;
```

#### 2.1.2 Reduce Over-Fetching

- Update `listAccessibleClients` to accept a `fields` parameter; default to essential columns only
- Update `getTask` in repository to use `.select()` with explicit columns instead of `*`

#### 2.1.3 Enable Partial Static Generation

- Remove `force-dynamic` from pages that don't need real-time data (e.g., `/legal`, `/account`)
- Use `revalidate = 60` on dashboard pages instead of `force-dynamic`
- Use `unstable_cache` from Next.js 14 for expensive queries:

```ts
import { unstable_cache } from 'next/cache';

const getCachedTask = unstable_cache(
  async (id: string) => taskRepo.getTask(id),
  ['task-detail'],
  { revalidate: 30, tags: [`task-${id}`] }
);
```

#### 2.1.4 Parallelize Page Data Loading

Current pattern (sequential):
```ts
const task = await getTask(id);
const steps = await getTaskSteps(id);
const activity = await getTaskActivity(id);
```

Optimized (parallel):
```ts
const [task, steps, activity, notes, workdone] = await Promise.all([
  getTask(id),
  getTaskSteps(id),
  getTaskActivity(id),
  getTaskNotes(id),
  getWorkDone(id),
]);
```

---

### Phase 2: Structural Improvements (3–5 days)

#### 2.2.1 Implement React Server Components (RSC) Properly

- **Current issue**: Many server components fetch data but don't leverage streaming
- **Fix**: Move heavy tab content into separate RSCs wrapped in `<Suspense>`:

```tsx
// task-detail-shell.tsx
<TabsContent value="activity">
  <Suspense fallback={<ActivitySkeleton />}>
    <TaskActivityPanel taskId={task.id} />
  </Suspense>
</TabsContent>
```

This allows the main shell to render immediately while activity/note data streams in.

#### 2.2.2 Add Edge Caching with Vercel

```ts
// route.ts or page.tsx
export const revalidate = 60;

// For API routes that serve reference data (services, sub-services, templates)
export async function GET() {
  // ...
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

#### 2.2.3 Virtualize Long Lists

Install `@tanstack/react-virtual` and wrap client/task tables:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

// Only render visible rows (~10-15) instead of all 500
```

#### 2.2.4 Debounce Search Inputs

Current: Every keystroke in client search triggers a server round-trip or re-render.
Fix: Add 300ms debounce to search inputs.

---

### Phase 3: Advanced Optimizations (1–2 weeks)

#### 2.3.1 Materialized Views for Dashboard

```sql
CREATE MATERIALIZED VIEW mv_dashboard_stats AS
SELECT
  client_id,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
  COUNT(*) FILTER (WHERE status = 'completed' AND completed_date >= CURRENT_DATE - INTERVAL '30 days') as completed_last_30d
FROM tasks
WHERE is_deleted = false
GROUP BY client_id;

-- Refresh every 5 minutes or on task mutations
CREATE INDEX idx_mv_dashboard_client ON mv_dashboard_stats(client_id);
```

#### 2.3.2 Connection Pooling + Read Replicas

- Supabase Pro provides read replicas; move analytics/reporting queries to replica
- Ensure `pgbouncer` is configured for connection pooling (Supabase handles this, but verify pool size)

#### 2.3.3 Image Optimization

- Replace all raw `<img>` with `next/image`
- Use `priority` prop for above-the-fold images (logos, avatars)
- Serve images from Supabase Storage through `next/image` loader

#### 2.3.4 Bundle Analysis + Code Splitting

```bash
npm install @next/bundle-analyzer
# Add to next.config.js:
const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
```

Target: Split heavy components (charts, rich text editors) into dynamic imports:

```tsx
const RechartsChart = dynamic(() => import('@/components/charts/recharts-chart'), { ssr: false });
```

---

## 3. Expected Impact

| Metric | Current | After Phase 1 | After Phase 3 |
|---|---|---|---|
| Task detail TTFB | ~800ms | ~300ms | ~150ms |
| Client list render | ~600ms (500 rows) | ~400ms | ~80ms (virtualized) |
| Dashboard load | ~1200ms | ~600ms | ~200ms (materialized views) |
| Bundle size | Unknown | -10% | -30% |

---

## 4. Implementation Priority

1. **Today**: Add DB indexes + parallelize page data loading
2. **This week**: `unstable_cache` on task detail + dashboard stats + virtualization
3. **Next sprint**: Materialized views + bundle analysis + RSC Suspense boundaries
