'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import EmptyState from '@/components/sophistication/empty-state';
import {
  Inbox,
  CheckCircle,
  ArrowRight,
  AlertCircle,
  FileText,
  Calendar,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { cn, formatDateIST, timeAgo } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { UnifiedInboxItem } from '@/lib/repositories/inbox';
import { resolveInboxItemAction } from '@/lib/actions/inbox';

interface UrgencyGroup {
  label: string;
  items: UnifiedInboxItem[];
}

function groupByUrgency(items: UnifiedInboxItem[]): UrgencyGroup[] {
  const today = new Date().toISOString().slice(0, 10);
  const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const overdue: UnifiedInboxItem[] = [];
  const dueToday: UnifiedInboxItem[] = [];
  const dueThisWeek: UnifiedInboxItem[] = [];
  const later: UnifiedInboxItem[] = [];

  for (const item of items) {
    const due = item.due_date?.slice(0, 10);
    if (!due) {
      later.push(item);
    } else if (due < today) {
      overdue.push(item);
    } else if (due === today) {
      dueToday.push(item);
    } else if (due <= weekLater) {
      dueThisWeek.push(item);
    } else {
      later.push(item);
    }
  }

  return [
    { label: 'Overdue', items: overdue },
    { label: 'Due today', items: dueToday },
    { label: 'Due this week', items: dueThisWeek },
    { label: 'Later', items: later },
  ].filter((g) => g.items.length > 0);
}

function itemTypeIcon(type: string) {
  switch (type) {
    case 'task':
      return <FileText className="h-4 w-4" />;
    case 'notice':
      return <AlertCircle className="h-4 w-4" />;
    case 'query':
      return <HelpCircle className="h-4 w-4" />;
    case 'compliance':
      return <Calendar className="h-4 w-4" />;
    default:
      return <Inbox className="h-4 w-4" />;
  }
}

function itemTypeBadgeClass(type: string): string {
  switch (type) {
    case 'task':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'notice':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'query':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'compliance':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return 'bg-zinc-50 text-zinc-700 border-zinc-200';
  }
}

function priorityDot(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-amber-500';
    case 'low':
      return 'bg-green-500';
    default:
      return 'bg-zinc-400';
  }
}

function metaSummary(item: UnifiedInboxItem): string | null {
  if (!item.meta || typeof item.meta !== 'object') return null;
  const parts: string[] = [];
  if (item.item_type === 'task') {
    if (item.meta.task_number) parts.push(String(item.meta.task_number));
    if (item.meta.is_stuck) parts.push('Stuck');
    if (item.meta.is_blocked_on_client) parts.push('Blocked on client');
  }
  if (item.item_type === 'notice') {
    if (item.meta.notice_type) parts.push(String(item.meta.notice_type));
    if (item.meta.authority) parts.push(String(item.meta.authority));
  }
  if (item.item_type === 'query') {
    if (item.meta.query_number) parts.push(String(item.meta.query_number));
  }
  if (item.item_type === 'compliance') {
    if (item.meta.rule_code) parts.push(String(item.meta.rule_code));
    if (item.meta.period_label) parts.push(String(item.meta.period_label));
  }
  return parts.length > 0 ? parts.join(' \u00b7 ') : null;
}

function getDetailPath(item: UnifiedInboxItem, basePath: string): string {
  switch (item.item_type) {
    case 'task':
      return `${basePath}/tasks/${item.id}`;
    case 'notice':
      return `${basePath}/notices/${item.id}`;
    case 'query':
      return `${basePath}/queries/${item.id}`;
    case 'compliance':
      if (item.related_entity_id) {
        return `${basePath}/tasks/${item.related_entity_id}`;
      }
      return `${basePath}/compliance`;
    default:
      return basePath;
  }
}

function primaryActionLabel(type: string): string {
  switch (type) {
    case 'task':
      return 'Complete';
    case 'notice':
      return 'Close';
    case 'query':
      return 'Mark resolved';
    case 'compliance':
      return 'Create task';
    default:
      return 'Act';
  }
}

export function InboxFeed({ items, basePath }: { items: UnifiedInboxItem[]; basePath: string }) {
  const router = useRouter();
  const [resolving, setResolving] = useState<Set<string>>(new Set());

  const groups = groupByUrgency(items);

  async function handleResolve(item: UnifiedInboxItem) {
    const key = `${item.item_type}-${item.id}`;
    setResolving((prev) => new Set(prev).add(key));
    try {
      const r = await resolveInboxItemAction({
        item_type: item.item_type,
        item_id: item.id,
      });
      if (r.success) {
        toast.success(`${item.item_type} resolved`);
        router.refresh();
      } else {
        toast.error(r.error ?? 'Failed to resolve');
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to resolve');
    } finally {
      setResolving((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your inbox is clear"
        body="There are no pending tasks, open notices, active queries, or upcoming compliance events right now."
        icon={<Inbox className="h-6 w-6 text-zinc-400" />}
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {groups.map((group) => (
        <div key={group.label} className="space-y-3">
          <div className="flex items-center gap-3 sticky top-0 bg-white/80 backdrop-blur-sm py-2 z-10">
            <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">
              {group.label}
            </h2>
            <span className="text-xs text-zinc-400 tabular-nums">
              {group.items.length}
            </span>
            <div className="flex-1 h-px bg-zinc-100" />
          </div>

          <div className="space-y-2">
            {group.items.map((item) => {
              const detailPath = getDetailPath(item, basePath);
              const itemKey = `${item.item_type}-${item.id}`;
              const isResolving = resolving.has(itemKey);
              const label = primaryActionLabel(item.item_type);

              return (
                <div
                  key={itemKey}
                  className={cn(
                    'rounded-xl border border-zinc-200 bg-white p-4',
                    'hover:border-zinc-300 transition-colors'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Task checkbox for quick complete */}
                    {item.item_type === 'task' && (
                      <div className="pt-1">
                        <Checkbox
                          disabled={isResolving}
                          onCheckedChange={() => handleResolve(item)}
                          className="border-zinc-300"
                        />
                      </div>
                    )}

                    <div
                      className={cn(
                        'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                        itemTypeBadgeClass(item.item_type)
                      )}
                    >
                      {itemTypeIcon(item.item_type)}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-sm font-medium text-zinc-900 truncate cursor-pointer hover:text-teal-700"
                          onClick={() => router.push(detailPath)}
                        >
                          {item.title}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
                            itemTypeBadgeClass(item.item_type)
                          )}
                        >
                          {item.item_type}
                        </span>
                        <span
                          className={cn(
                            'inline-block h-2 w-2 rounded-full',
                            priorityDot(item.priority)
                          )}
                          title={`Priority: ${item.priority}`}
                        />
                      </div>

                      <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                        {item.client_name && (
                          <span className="truncate">{item.client_name}</span>
                        )}
                        <span className="text-zinc-300">·</span>
                        <span className="tabular-nums" title={formatDateIST(item.occurred_at)}>
                          {timeAgo(item.occurred_at)}
                        </span>
                        {item.due_date && (
                          <>
                            <span className="text-zinc-300">·</span>
                            <span className="tabular-nums">
                              Due {formatDateIST(item.due_date)}
                            </span>
                          </>
                        )}
                        {metaSummary(item) && (
                          <>
                            <span className="text-zinc-300">·</span>
                            <span className="text-zinc-400">{metaSummary(item)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Primary action */}
                    <div className="shrink-0">
                      {item.item_type === 'compliance' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs rounded-lg"
                          onClick={() => router.push(detailPath)}
                        >
                          {label}
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs rounded-lg"
                          disabled={isResolving}
                          onClick={() => handleResolve(item)}
                        >
                          {isResolving ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          )}
                          {label}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
