'use server';

import { requireRole } from '@/lib/auth/require-role';
import { requireCapability, hasCapability } from '@/lib/auth/require-capability';
import { getTask, listTaskActivity, listTaskNotes, listTasks, enrichTasksWithProgress } from '@/lib/repositories/tasks';
import { getClientById, listTeamUsers, listClientGroups, listClientUsers, listTeamAssignments } from '@/lib/repositories/clients';
import { listClientServices, listClientSubServices } from '@/lib/repositories/services';
import { listTaskTemplates } from '@/lib/repositories/task-templates';
import { listTaskSteps } from '@/lib/repositories/task-steps';
import { listDefinitionsForSubService, listValuesForTask, listLabels, listLabelsForTask } from '@/lib/repositories/task-custom-fields';
import { listWorkDoneForTask } from '@/lib/repositories/workdone';
import { getQueryWithMessages, listQueries } from '@/lib/repositories/queries';
import { getNoticeById, listAllNotices, listHearings } from '@/lib/repositories/notices';
import { listEntityAuditLogs } from '@/lib/repositories/audit';
import { listEffectiveCapabilities, listGrantedCapabilities } from '@/lib/repositories/staff-capabilities';
import { listRoleTemplates } from '@/lib/repositories/role-templates';
import { createClient } from '@/lib/supabase/server';
import { ok, fail } from '@/lib/actions/result';

export async function getTaskDockData(id: string) {
  try {
    const me = await requireRole(['admin', 'team']);

    // Enforce task access capability (defense in depth beyond RLS).
    // Any meaningful task permission grants dock access; tasks.view is the read-all capability.
    const canAccess = await hasCapability(me, 'tasks.view')
      || await hasCapability(me, 'tasks.edit')
      || await hasCapability(me, 'tasks.assign')
      || await hasCapability(me, 'tasks.complete')
      || await hasCapability(me, 'tasks.delete')
      || await hasCapability(me, 'tasks.create');
    if (!canAccess) {
      await requireCapability(me, 'tasks.view');
    }

    const task = await getTask(id);
    if (!task) return fail('Task not found');

    const [activity, notes, team, steps, cfDefs, cfValues, allLabels, assignedLabels, workdone, subServices, taskTemplates] = await Promise.all([
      listTaskActivity(id),
      listTaskNotes(id),
      listTeamUsers(),
      listTaskSteps(id),
      task.sub_service_id ? listDefinitionsForSubService(task.sub_service_id) : Promise.resolve([]),
      listValuesForTask(id),
      listLabels(),
      listLabelsForTask(id),
      listWorkDoneForTask(id),
      listClientSubServices(task.client_id!),
      listTaskTemplates(),
    ]);

    const canEdit = await hasCapability(me, 'tasks.edit');

    return ok({
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
      subServices,
      taskTemplates,
      currentUserId: me.id,
      canEdit,
    });
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getClientDockData(id: string) {
  try {
    const me = await requireRole(['admin', 'team']);
    const canReadAll = await hasCapability(me, 'clients.read.all');
    const canEdit = await hasCapability(me, 'clients.edit');
    if (!canReadAll && !canEdit) {
      await requireCapability(me, 'clients.read.all');
    }

    const client = await getClientById(id);
    if (!client) return fail('Client not found');

    const [groups, owners, clientServices, clientSubServices, clientUsers, teamAssignments, auditLogs, rawTasks, notices, queries] = await Promise.all([
      listClientGroups(),
      listTeamUsers(),
      listClientServices(id),
      listClientSubServices(id),
      listClientUsers(id),
      listTeamAssignments(id),
      listEntityAuditLogs('client', id),
      listTasks({ clientId: id, limit: 20 }),
      listAllNotices({ clientId: id }),
      listQueries({ clientId: id }),
    ]);

    const tasks = await enrichTasksWithProgress(rawTasks);
    const openTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
    const openNotices = notices.filter((n: { status: string }) => n.status !== 'closed');

    return ok({
      client,
      groups,
      owners,
      clientServices,
      clientSubServices,
      clientUsers,
      teamAssignments,
      auditLogs,
      openTasks,
      openNotices,
      openQueries: queries,
      basePath: me.role === 'admin' ? '/admin/clients' : '/team/clients',
      canEdit: await hasCapability(me, 'clients.edit'),
    });
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getQueryDockData(id: string) {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'queries.assign');

    const data = await getQueryWithMessages(id);
    if (!data) return fail('Query not found');

    return ok({ data, basePath: me.role === 'admin' ? '/admin/queries' : '/team/queries', canActAsTeam: true });
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getNoticeDockData(id: string) {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'notices.manage');

    const notice = await getNoticeById(id);
    if (!notice) return fail('Notice not found');

    const [hearings, auditLogs] = await Promise.all([
      listHearings({ noticeId: id }),
      listEntityAuditLogs('notice', id),
    ]);

    return ok({ notice, hearings, auditLogs });
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getTeamMemberDockData(id: string) {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'staff.manage');

    const sb = createClient();
    const { data: user } = await sb
      .from('users_profile')
      .select('id, full_name, email, role, is_active, phone_number, job_title, department, active_role_template_id, is_prime_admin, reports_to')
      .eq('id', id)
      .maybeSingle();
    if (!user) return fail('Team member not found');

    const [caps, templates, teamList, payroll] = await Promise.all([
      listEffectiveCapabilities(id),
      listRoleTemplates(),
      sb.from('users_profile').select('id, full_name, email').in('role', ['team', 'admin']).eq('is_active', true).order('full_name'),
      sb.from('staff_payroll_settings').select('monthly_salary, paid_leaves_per_month, deduction_applicable, salary_adjustment_for_leaves').eq('user_id', id).maybeSingle(),
    ]);

    const activeTemplate = templates.find((t) => t.id === user.active_role_template_id);
    // Divergence = any explicit deviation row exists (regardless of template)
    const overrideRows = await listGrantedCapabilities(id);
    const isDiverged = overrideRows.length > 0;

    return ok({
      user,
      caps,
      templates,
      teamList: teamList.data ?? [],
      payroll: payroll.data,
      activeTemplate,
      isDiverged,
      canPromote: me.is_prime_admin ?? false,
      canDemote: (me.is_prime_admin ?? false) && user.role === 'admin' && !user.is_prime_admin,
    });
  } catch (e: any) {
    return fail(e.message);
  }
}
