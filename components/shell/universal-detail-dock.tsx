'use client';

import { useDockState, useDockActions, type DockItem } from '@/lib/state/dock-state';
import { Suspense, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { X, ArrowLeft, Loader2 } from 'lucide-react';
import { getTaskDockData, getClientDockData, getTeamMemberDockData } from '@/lib/actions/dock-data';
import TaskDetailShell from '@/components/tasks/task-detail-shell';
import ClientDetailShell from '@/components/clients/client-detail-shell';
import TeamClientDetailShell from '@/components/clients/team-client-detail-shell';
import TeamDetailShell from '@/components/team/team-detail-shell';
import useSWR from 'swr';
import { ENABLE_STREAMED_DOCK } from '@/lib/flags';
import { cn } from '@/lib/utils';

const fetchers = {
  task: getTaskDockData,
  client: getClientDockData,
  team: getTeamMemberDockData,
};

type DockItemType = keyof typeof fetchers;

type TaskDockData = NonNullable<Extract<Awaited<ReturnType<typeof getTaskDockData>>, { success: true }>['data']>;
type ClientDockData = NonNullable<Extract<Awaited<ReturnType<typeof getClientDockData>>, { success: true }>['data']>;
type TeamDockData = NonNullable<Extract<Awaited<ReturnType<typeof getTeamMemberDockData>>, { success: true }>['data']>;

export function UniversalDetailDock() {
  const stack = useDockState();
  const { pop, clear } = useDockActions();

  if (stack.length === 0) return null;

  const topItem = stack[stack.length - 1];
  const isStacked = stack.length > 1;

  return (
    <>
      <div
        role="button"
        tabIndex={-1}
        aria-label="Close detail panel"
        className="fixed inset-0 z-[100] bg-slate-900/35 backdrop-blur-[2px] transition-opacity"
        onClick={clear}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); clear(); } }}
      />
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 z-[101] flex w-full max-w-full flex-col border-l border-[#E8EAEE] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] transition-transform duration-200 ease-out',
          topItem.type === 'task' ? 'md:w-[540px]' : 'md:w-[50vw] md:min-w-[640px] md:max-w-[90vw]',
        )}
        style={{ transform: 'translateX(0)' }}
      >
        {/* The task panel puts its actions here, on the left edge, outside the pane */}
        <div id="dock-rail" className="absolute right-full top-16 z-[102] mr-3" />
        <div className="h-14 flex items-center justify-between px-4 border-b border-[#E8EAEE] bg-white shrink-0">
          <div className="flex items-center gap-2">
            {isStacked && (
              <button 
                onClick={pop}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {{ task: 'Task', client: 'Client', team: 'Team member' }[topItem.type] ?? topItem.type}
            </span>
          </div>
          <button 
            onClick={clear}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
            title="Close"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {ENABLE_STREAMED_DOCK ? (
            <Suspense fallback={<PanelSkeleton />}>
              <DockPanelAsync item={topItem} />
            </Suspense>
          ) : (
            <DockPanelLegacy item={topItem} />
          )}
        </div>
      </div>
    </>
  );
}

function PanelSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
    </div>
  );
}

function DockPanelAsync({ item }: { item: DockItem }) {
  const prefix = usePathnamePrefix();
  const fetcher = fetchers[item.type] as (id: string) => Promise<any>;

  const { data, error, mutate } = useSWR(
    ['dock', item.type, item.id],
    () => fetcher(item.id),
    { suspense: true, revalidateOnFocus: false }
  );

  if (error) return <div className="p-6 text-center text-sm text-red-500">{error.message || 'Failed to load'}</div>;
  if (!data?.success) return <div className="p-6 text-center text-sm text-red-500">{data?.error || 'Failed to load'}</div>;

  // After any change inside the panel (status, notes, flags, work logs) refetch the panel's data.
  // Without this the cached copy stayed stale and the panel looked as if nothing had happened.
  return renderPanel(item.type, data.data, prefix, () => { void mutate(); }, item.mode === 'edit');
}

function DockPanelLegacy({ item }: { item: DockItem }) {
  const prefix = usePathnamePrefix();
  const [taskData, setTaskData] = useState<TaskDockData | null>(null);
  const [clientData, setClientData] = useState<ClientDockData | null>(null);
  const [teamData, setTeamData] = useState<TeamDockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setTaskData(null);
    setClientData(null);
    setTeamData(null);

    async function load() {
      try {
        if (item.type === 'task') {
          const res = await getTaskDockData(item.id);
          if (!active) return;
          if (res.success) setTaskData(res.data);
          else setError(res.error || 'Failed to load task');
        } else if (item.type === 'client') {
          const res = await getClientDockData(item.id);
          if (!active) return;
          if (res.success) setClientData(res.data);
          else setError(res.error || 'Failed to load client');
        } else if (item.type === 'team') {
          const res = await getTeamMemberDockData(item.id);
          if (!active) return;
          if (res.success) setTeamData(res.data);
          else setError(res.error || 'Failed to load team member');
        } else {
          setError(`Unknown type: ${item.type}`);
        }
      } catch (e: any) {
        if (active) setError(e.message || 'Failed to load');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [item, refreshKey]);

  if (loading) return <PanelSkeleton />;
  if (error) return <div className="p-6 text-center text-sm text-red-500">{error}</div>;

  return renderPanel(item.type, taskData ?? clientData ?? teamData, prefix, refresh, item.mode === 'edit');
}

function usePathnamePrefix() {
  const pathname = usePathname();
  return pathname.startsWith('/team') ? '/team' : '/admin';
}

function renderPanel(type: string, data: any, prefix: string, onRefresh?: () => void, startInEdit = false) {
  if (type === 'task' && data?.task) {
    return (
      <div className="px-2 md:px-4 py-4 min-h-full">
        <TaskDetailShell
          key={`${data.task.id}${startInEdit ? ':edit' : ''}`}
          task={data.task}
          activity={data.activity}
          notes={data.notes}
          team={data.team}
          steps={data.steps}
          cfDefs={data.cfDefs}
          cfValues={data.cfValues}
          allLabels={data.allLabels}
          assignedLabels={data.assignedLabels}
          workdone={data.workdone}
          subServices={data.subServices ?? []}
          taskTemplates={data.taskTemplates ?? []}
          currentUserId={data.currentUserId}
          canEdit={data.canEdit ?? false}
          canEditSteps={data.canEditSteps ?? false}
          canDelete={data.canDelete ?? false}
          isAdmin={data.isAdmin ?? false}
          canAssign={data.canAssign ?? false}
          clientGstFrequency={data.clientGstFrequency ?? null}
          startInEdit={startInEdit}
          basePath={`${prefix}/tasks`}
          clientPath={`${prefix}/clients/${data.task.client_id}`}
          isModal={true}
          onRefresh={onRefresh}
        />
      </div>
    );
  }

  if (type === 'client' && data?.client) {
    const isAdmin = !data.basePath.startsWith('/team');
    if (isAdmin) {
      return (
        <div className="px-2 md:px-4 py-4 min-h-full">
          <ClientDetailShell
            client={data.client}
            groups={data.groups}
            owners={data.owners}
            clientServices={data.clientServices}
            clientSubServices={data.clientSubServices}
            teamAssignments={data.teamAssignments}
            auditLogs={data.auditLogs}
            openTasks={data.openTasks}
            basePath={data.basePath}
            canEdit={data.canEdit ?? false}
            canDelete={data.canDelete ?? false}
            isModal={true}
          />
        </div>
      );
    }
    return (
      <div className="px-2 md:px-4 py-4 min-h-full">
        <TeamClientDetailShell
          client={data.client}
          subs={data.clientSubServices}
          auditLogs={data.auditLogs}
          openTasks={data.openTasks}
          canEdit={data.canEdit ?? false}
          basePath={data.basePath}
          isModal={true}
        />
      </div>
    );
  }

  if (type === 'team' && data?.user) {
    return (
      <div className="px-2 md:px-4 py-4 min-h-full">
        <TeamDetailShell
          user={data.user}
          caps={data.caps}
          templates={data.templates}
          teamList={data.teamList}
          activeTemplate={data.activeTemplate}
          isDiverged={data.isDiverged}
          canPromote={data.canPromote}
          canDemote={data.canDemote}
          basePath={`${prefix}/team`}
          isModal={true}
        />
      </div>
    );
  }

  return <div className="p-6 text-sm text-slate-500">View for {type} not implemented yet.</div>;
}
