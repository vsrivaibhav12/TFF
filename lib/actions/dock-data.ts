'use server';

import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { hasCapabilities } from '@/lib/auth/capabilities-cache';
import { getTask, listTaskActivity, listTaskNotes, listTasks, enrichTasksWithProgress } from '@/lib/repositories/tasks';
import { getClientById, listTeamUsers, listClientGroups, listTeamAssignments } from '@/lib/repositories/clients';
import { listClientServices, listClientSubServices, listSubServices } from '@/lib/repositories/services';
import { listTaskTemplates } from '@/lib/repositories/task-templates';
import { listTaskSteps } from '@/lib/repositories/task-steps';
import { listDefinitionsForSubService, listValuesForTask, listLabels, listLabelsForTask } from '@/lib/repositories/task-custom-fields';
import { listWorkDoneForTask } from '@/lib/repositories/workdone';
import { listEntityAuditLogs } from '@/lib/repositories/audit';
import { listEffectiveCapabilities, listGrantedCapabilities } from '@/lib/repositories/staff-capabilities';
import { listRoleTemplates } from '@/lib/repositories/role-templates';
import { createClient } from '@/lib/supabase/server';
import { ok, fail } from '@/lib/actions/result';

/**
 * Sub-services a task can be moved to. Every active sub-service is offered, not
 * just the ones already linked to the client; the link is created on save.
 * Shape matches client_sub_services rows so the existing picker keeps working.
 */
async function listSubServicesForTaskPicker(clientId: string) {
  const [all, linked] = await Promise.all([listSubServices(), listClientSubServices(clientId)]);
  const linkedIds = new Set((linked as any[]).map((l) => l.sub_service_id));
  return (all as any[]).map((s) => ({
    sub_service_id: s.id,
    linked: linkedIds.has(s.id),
    sub_services: { name: s.name, services: s.services ? { name: s.services.name } : null },
  }));
}

export async function getTaskDockData(id: string) {
  try {
    const me = await requireRole(['admin', 'team']);

    // Enforce task access capability (defense in depth beyond RLS).
    // Any meaningful task permission grants dock access; tasks.view is the read-all capability.
    const taskAccessCaps = await hasCapabilities(me, [
      'tasks.view', 'tasks.edit', 'tasks.assign', 'tasks.complete', 'tasks.delete', 'tasks.create',
    ]);
    const canAccess = taskAccessCaps.size > 0;
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
      listSubServicesForTaskPicker(task.client_id!),
      listTaskTemplates(),
    ]);

    const taskCaps = await hasCapabilities(me, ['tasks.edit', 'tasks.complete', 'tasks.delete']);
    const canEdit = taskCaps.has('tasks.edit');
    const canEditSteps = taskCaps.has('tasks.complete');
    const canDelete = taskCaps.has('tasks.delete');

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
      canEditSteps,
      canDelete,
    });
  } catch (e: any) {
    return fail(e.message);
  }
}

export async function getClientDockData(id: string) {
  try {
    const me = await requireRole(['admin', 'team']);
    const clientCaps = await hasCapabilities(me, ['clients.read.all', 'clients.edit']);
    const canReadAll = clientCaps.has('clients.read.all');
    const canEdit = clientCaps.has('clients.edit');
    if (!canReadAll && !canEdit) {
      await requireCapability(me, 'clients.read.all');
    }

    const client = await getClientById(id);
    if (!client) return fail('Client not found');

    const [groups, owners, clientServices, clientSubServices, teamAssignments, auditLogs, rawTasks] = await Promise.all([
      listClientGroups(),
      listTeamUsers(),
      listClientServices(id),
      listClientSubServices(id),
      listTeamAssignments(id),
      listEntityAuditLogs('client', id),
      listTasks({ clientId: id, limit: 20 }),
    ]);

    const tasks = await enrichTasksWithProgress(rawTasks);
    const openTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');

    const canDelete = (await hasCapabilities(me, 'clients.delete')).has('clients.delete');

    return ok({
      client,
      groups,
      owners,
      clientServices,
      clientSubServices,
      teamAssignments,
      auditLogs,
      openTasks,
      basePath: me.role === 'admin' ? '/admin/clients' : '/team/clients',
      canEdit,
      canDelete,
    });
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

    const [caps, templates, teamList] = await Promise.all([
      listEffectiveCapabilities(id),
      listRoleTemplates(),
      sb.from('users_profile').select('id, full_name, email').in('role', ['team', 'admin']).eq('is_active', true).order('full_name'),
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
      activeTemplate,
      isDiverged,
      canPromote: me.is_prime_admin ?? false,
      canDemote: (me.is_prime_admin ?? false) && user.role === 'admin' && !user.is_prime_admin,
    });
  } catch (e: any) {
    return fail(e.message);
  }
}
