'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronLeft } from 'lucide-react';
import { formatDateIST, timeAgo } from '@/lib/utils';
import TaskActions from '@/app/team/tasks/[id]/task-actions';
import TaskStepsPanel from '@/components/tasks/task-steps-panel';
import SendReminderButton from '@/components/tasks/send-reminder-button';
import StuckToggle from '@/components/tasks/stuck-toggle';
import BlockedOnClientToggle from '@/components/tasks/blocked-on-client-toggle';
import CustomFieldsPanel from '@/components/tasks/custom-fields-panel';
import WorkDonePanel from '@/components/tasks/workdone-panel';
import DeleteTaskButton from '@/components/tasks/delete-task-button';
import VerifyTaskButton from '@/components/tasks/verify-task-button';

interface Props {
  task: any;
  activity: any[];
  notes: any[];
  team: any[];
  steps: any[];
  cfDefs: any[];
  cfValues: any[];
  allLabels: any[];
  assignedLabels: any[];
  workdone: any[];
  currentUserId: string;
  canEditSteps: boolean;
  basePath: string;
  clientPath: string;
}

export default function TaskDetailShell({
  task,
  activity,
  notes,
  team,
  steps,
  cfDefs,
  cfValues,
  allLabels,
  assignedLabels,
  workdone,
  currentUserId,
  canEditSteps,
  basePath,
  clientPath,
}: Props) {
  const isClosed = task.status === 'completed' || task.status === 'cancelled';

  return (
    <div className="space-y-8">
      <Link
        href={basePath}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" /> Tasks
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-zinc-400">{task.task_number ?? '—'}</span>
          {task.is_billable && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
              Billable{task.bill_reference ? ` · ${task.bill_reference}` : ''}
            </span>
          )}
        </div>
        <h1 className="tff-page-title">{task.title}</h1>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Badge
            variant={
              task.status === 'completed'
                ? 'success'
                : task.status === 'in_progress'
                ? 'teal'
                : 'warning'
            }
          >
            {task.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline">{task.priority}</Badge>
          {task.is_verified && (
            <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">Verified</Badge>
          )}
          <Link
            href={clientPath}
            className="text-sm text-zinc-500 hover:text-teal-700 hover:underline"
          >
            {task.clients?.business_name}
          </Link>
        </div>
        {task.labels && task.labels.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            {task.labels.map((label: string) => (
              <Badge key={label} variant="outline" className="bg-zinc-100 text-zinc-600 border-zinc-200">
                {label}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Tabs + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="steps">Steps ({steps.length})</TabsTrigger>
              <TabsTrigger value="work">Work done</TabsTrigger>
              <TabsTrigger value="activity">Activity ({activity.length})</TabsTrigger>
              <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="tff-card p-6">
                <h3 className="font-semibold mb-3">Description</h3>
                <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                  {task.description || <span className="text-zinc-400 italic">No description provided.</span>}
                </p>
              </div>

              {!isClosed && (
                <StuckToggle
                  taskId={task.id}
                  isStuck={!!task.is_stuck}
                  reasonCode={task.stuck_reason_code}
                  reasonNote={task.stuck_reason_note}
                />
              )}

              <BlockedOnClientToggle
                taskId={task.id}
                isBlocked={!!task.is_blocked_on_client}
              />

              {task.is_blocked_on_client && <SendReminderButton taskId={task.id} />}

              <TaskActions task={task} team={team} />

              <CustomFieldsPanel
                taskId={task.id}
                definitions={cfDefs}
                values={cfValues}
                allLabels={allLabels}
                assignedLabels={assignedLabels}
              />
            </TabsContent>

            <TabsContent value="steps">
              <TaskStepsPanel taskId={task.id} initial={steps} editable={canEditSteps} allowAddStep={canEditSteps} />
            </TabsContent>

            <TabsContent value="work">
              <WorkDonePanel taskId={task.id} initial={workdone} currentUserId={currentUserId} />
            </TabsContent>

            <TabsContent value="activity">
              <div className="tff-card p-6">
                <h3 className="font-semibold mb-4">Activity ({activity.length})</h3>
                <div className="relative pl-6 border-l-2 border-zinc-100 space-y-6">
                  {activity.map((a: any) => (
                    <div key={a.id} className="relative">
                      <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-2 border-teal-500" />
                      <div className="text-xs font-bold text-zinc-400 mb-1">{timeAgo(a.created_at)}</div>
                      <div className="text-sm text-zinc-700">
                        <span className="font-semibold text-zinc-900">{a.users_profile?.full_name || 'System'}</span>{' '}
                        {a.action}
                        {a.field_name === 'status' && (
                          <Badge variant="outline" className="ml-2 text-[10px] lowercase border-zinc-100 font-mono">
                            {a.old_value || '—'} → {a.new_value}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {activity.length === 0 && <p className="text-zinc-400 text-sm">No activity recorded yet.</p>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes">
              <div className="tff-card p-6">
                <h3 className="font-semibold mb-3">Notes ({notes.length})</h3>
                <div className="space-y-4">
                  {notes.map((n: any) => (
                    <div key={n.id} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex justify-between">
                        <span>{n.users_profile?.full_name}</span>
                        <span>{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">{n.note_text}</p>
                    </div>
                  ))}
                  {notes.length === 0 && <p className="text-zinc-300 text-xs text-center py-4 italic">No internal notes yet.</p>}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="tff-card p-6">
            <h3 className="font-semibold mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <DetailItem label="Due" value={formatDateIST(task.due_date)} />
              <DetailItem label="Created" value={formatDateIST(task.created_date) || '—'} />
              <DetailItem label="Started" value={formatDateIST(task.started_date) || 'Not started'} />
              <DetailItem label="Completed" value={formatDateIST(task.completed_date) || 'Not completed'} />
              {task.completed_date && task.created_date && (
                <DetailItem label="Turnaround" value={`${turnaroundDays(task.created_date, task.completed_date)} days`} />
              )}
              <DetailItem label="Task number" value={task.task_number ?? '—'} />
              <DetailItem label="Period" value={task.period_month && task.period_year ? `${task.period_month}/${task.period_year}${task.period_quarter ? ` · Q${task.period_quarter}` : ''}` : '—'} />
              <DetailItem label="Assignee" value={task.assignee?.full_name || '—'} />
              <DetailItem label="Reviewer" value={task.reviewer?.full_name || '—'} />
              <DetailItem label="Service" value={task.sub_services ? `${task.sub_services.services?.name ?? ''} › ${task.sub_services.name}` : '—'} />
              {task.is_billable && (
                <DetailItem label="Billing" value={`Billable · ${task.bill_reference || 'No ref'}`} />
              )}
              {task.arn_reference && (
                <DetailItem label="ARN / Ref" value={`${task.arn_reference}${task.is_arn_client_visible ? ' (client visible)' : ''}`} />
              )}
            </dl>
          </div>

          {task.status === 'completed' && (
            <div className="space-y-3">
              {task.is_verified ? (
                <div className="text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 flex items-center gap-2">
                  <span className="font-semibold">Verified</span>
                  <span className="text-teal-600">· {task.verification_note || 'No note'}</span>
                </div>
              ) : (
                <VerifyTaskButton taskId={task.id} />
              )}
            </div>
          )}
          {task.status !== 'completed' && (
            <div className="pt-2">
              <DeleteTaskButton taskId={task.id} redirectTo={basePath} />
            </div>
          )}

          {task.custom_fields && Object.keys(task.custom_fields).length > 0 && (
            <div className="tff-card p-6">
              <h3 className="font-semibold mb-3">Custom Fields</h3>
              <dl className="space-y-3 text-sm">
                {Object.entries(task.custom_fields as Record<string, any>).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-zinc-500 mb-1 capitalize">{key.replace(/_/g, ' ')}</dt>
                    <dd className="font-medium text-zinc-900">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
      <dt className="text-zinc-500 text-xs">{label}</dt>
      <dd className="font-semibold text-zinc-900">{value}</dd>
    </div>
  );
}

function turnaroundDays(created: string, completed: string): number {
  const c = new Date(created);
  const d = new Date(completed);
  const diff = d.getTime() - c.getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}
