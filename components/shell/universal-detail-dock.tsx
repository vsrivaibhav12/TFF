'use client';

import { useDockState, useDockActions, type DockItem } from '@/lib/state/dock-state';
import { Suspense, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { X, ArrowLeft, Loader2 } from 'lucide-react';
import { getTaskDockData, getClientDockData, getQueryDockData, getNoticeDockData, getTeamMemberDockData } from '@/lib/actions/dock-data';
import TaskDetailShell from '@/components/tasks/task-detail-shell';
import ClientDetailShell from '@/components/clients/client-detail-shell';
import TeamClientDetailShell from '@/components/clients/team-client-detail-shell';
import QueryDetailShell from '@/components/queries/query-detail-shell';
import NoticeDetailShell from '@/components/notices/notice-detail-shell';
import TeamDetailShell from '@/components/team/team-detail-shell';
import useSWR from 'swr';
import { ENABLE_STREAMED_DOCK } from '@/lib/flags';

const fetchers = {
  task: getTaskDockData,
  client: getClientDockData,
  query: getQueryDockData,
  notice: getNoticeDockData,
  team: getTeamMemberDockData,
};

type DockItemType = keyof typeof fetchers;

type TaskDockData = NonNullable<Extract<Awaited<ReturnType<typeof getTaskDockData>>, { success: true }>['data']>;
type ClientDockData = NonNullable<Extract<Awaited<ReturnType<typeof getClientDockData>>, { success: true }>['data']>;
type QueryDockData = NonNullable<Extract<Awaited<ReturnType<typeof getQueryDockData>>, { success: true }>['data']>;
type NoticeDockData = NonNullable<Extract<Awaited<ReturnType<typeof getNoticeDockData>>, { success: true }>['data']>;
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
        className="fixed inset-0 z-[100] bg-zinc-900/30 backdrop-blur-sm transition-opacity"
        onClick={clear}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); clear(); } }}
      />
      <div
        className="fixed right-0 top-0 bottom-0 w-[50vw] min-w-[640px] max-w-[90vw] bg-white shadow-2xl z-[101] flex flex-col border-l border-zinc-200 transition-transform duration-200 ease-out"
        style={{ transform: 'translateX(0)' }}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-200/60 bg-zinc-50 shrink-0">
          <div className="flex items-center gap-2">
            {isStacked && (
              <button 
                onClick={pop}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-200 text-zinc-500 transition-colors"
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <span className="text-sm font-medium text-zinc-500 uppercase tracking-wider text-[11px]">
              {topItem.type}
            </span>
          </div>
          <button 
            onClick={clear}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors"
            title="Close"
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
      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
    </div>
  );
}

function DockPanelAsync({ item }: { item: DockItem }) {
  const prefix = usePathnamePrefix();
  const fetcher = fetchers[item.type] as (id: string) => Promise<any>;

  const { data, error } = useSWR(
    ['dock', item.type, item.id],
    () => fetcher(item.id),
    { suspense: true, revalidateOnFocus: false }
  );

  if (error) return <div className="p-6 text-center text-sm text-red-500">{error.message || 'Failed to load'}</div>;
  if (!data?.success) return <div className="p-6 text-center text-sm text-red-500">{data?.error || 'Failed to load'}</div>;

  return renderPanel(item.type, data.data, prefix);
}

function DockPanelLegacy({ item }: { item: DockItem }) {
  const prefix = usePathnamePrefix();
  const [taskData, setTaskData] = useState<TaskDockData | null>(null);
  const [clientData, setClientData] = useState<ClientDockData | null>(null);
  const [queryData, setQueryData] = useState<QueryDockData | null>(null);
  const [noticeData, setNoticeData] = useState<NoticeDockData | null>(null);
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
    setQueryData(null);
    setNoticeData(null);
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
        } else if (item.type === 'query') {
          const res = await getQueryDockData(item.id);
          if (!active) return;
          if (res.success) setQueryData(res.data);
          else setError(res.error || 'Failed to load query');
        } else if (item.type === 'notice') {
          const res = await getNoticeDockData(item.id);
          if (!active) return;
          if (res.success) setNoticeData(res.data);
          else setError(res.error || 'Failed to load notice');
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

  return renderPanel(item.type, taskData ?? clientData ?? queryData ?? noticeData ?? teamData, prefix, refresh);
}

function usePathnamePrefix() {
  const pathname = usePathname();
  return pathname.startsWith('/team') ? '/team' : pathname.startsWith('/portal') ? '/portal' : '/admin';
}

function renderPanel(type: string, data: any, prefix: string, onRefresh?: () => void) {
  if (type === 'task' && data?.task) {
    return (
      <div className="px-2 md:px-4 py-4 min-h-full">
        <TaskDetailShell
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
            clientUsers={data.clientUsers}
            teamAssignments={data.teamAssignments}
            auditLogs={data.auditLogs}
            openTasks={data.openTasks}
            openNotices={data.openNotices}
            openQueries={data.openQueries}
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
          openNotices={data.openNotices}
          openQueries={data.openQueries}
          canEdit={data.canEdit ?? false}
          basePath={data.basePath}
          isModal={true}
        />
      </div>
    );
  }

  if (type === 'query' && data?.data) {
    return (
      <div className="px-2 md:px-4 py-4 min-h-full">
        <QueryDetailShell
          data={data.data}
          basePath={data.basePath}
          canActAsTeam={data.canActAsTeam}
          isModal={true}
        />
      </div>
    );
  }

  if (type === 'notice' && data?.notice) {
    return (
      <div className="px-2 md:px-4 py-4 min-h-full">
        <NoticeDetailShell
          notice={data.notice}
          hearings={data.hearings}
          auditLogs={data.auditLogs}
          clientBasePath={`${prefix}/clients`}
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
          payroll={data.payroll}
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

  return <div className="p-6 text-sm text-zinc-500">View for {type} not implemented yet.</div>;
}
