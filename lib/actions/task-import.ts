'use server';
import { fetchAll } from '@/lib/supabase/fetch-all';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { parseTasksBuffer, type ParsedTaskRow } from '@/lib/services/task-import-service';
import { createTaskAction } from '@/lib/actions/tasks';
import { buildTaskTitle } from '@/lib/utils';

export interface TaskImportPreview {
  rows: ParsedTaskRow[];
  summary: { total: number; ready: number; error: number };
  fileName: string;
}

export interface TaskImportErrorEntry {
  row_index: number;
  task_info: string;
  error: string;
}

export async function previewTaskImportAction(formData: FormData): Promise<ActionResult<TaskImportPreview>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.create');
    const file = formData.get('file');
    if (!(file instanceof File)) return fail('No file provided', 'VALIDATION');
    if (file.size === 0) return fail('Empty file', 'VALIDATION');
    if (file.size > 5 * 1024 * 1024) return fail('File exceeds 5 MB limit', 'VALIDATION');

    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);
    const rows = parseTasksBuffer(buf, file.name);
    if (rows.length === 0) return fail('No data rows found in the file', 'EMPTY');

    const summary = {
      total: rows.length,
      error: rows.filter((r) => r.errors.length > 0).length,
      ready: rows.length - rows.filter((r) => r.errors.length > 0).length,
    };
    return ok({ rows, summary, fileName: file.name });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

export async function commitTaskImportAction(input: {
  file_name: string;
  rows: ParsedTaskRow[];
}): Promise<ActionResult<{
  inserted: number;
  skipped: number;
  failed: number;
  errors: TaskImportErrorEntry[];
}>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'tasks.create');
    if (!Array.isArray(input.rows) || input.rows.length === 0) {
      return fail('No rows to import', 'VALIDATION');
    }
    const sb = createClient();

    // Pre-load data for matching using fetchAll to bypass 1000 row limit
    const clients = await fetchAll<any>(() => sb.from('clients').select('id, pan, business_name').eq('is_deleted', false));
    const subServices = await fetchAll<any>(() => sb.from('sub_services').select('id, code, name').eq('is_deleted', false).eq('is_active', true));
    const teamMembers = await fetchAll<any>(() => sb.from('users_profile').select('id, full_name').eq('role', 'team').eq('is_active', true));
    
    // Pre-load active task templates to automatically assign the first one
    const templates = await fetchAll<any>(() => sb.from('task_templates').select('id, sub_service_id').eq('is_deleted', false).eq('is_active', true));

    const clientPanMap = new Map<string, string>();
    const clientNameMap = new Map<string, string>();
    clients?.forEach((c: any) => {
      if (c.pan) clientPanMap.set(c.pan.toUpperCase(), c.id);
      if (c.business_name) clientNameMap.set(c.business_name.toLowerCase().trim(), c.id);
    });

    const subServiceMap = new Map<string, string>();
    subServices?.forEach((ss: any) => {
      if (ss.code) subServiceMap.set(ss.code.toLowerCase().trim(), ss.id);
      if (ss.name) subServiceMap.set(ss.name.toLowerCase().trim(), ss.id);
    });

    const assigneeMap = new Map<string, string>();
    teamMembers?.forEach((tm: any) => {
      if (tm.full_name) assigneeMap.set(tm.full_name.toLowerCase().trim(), tm.id);
    });

    const templateMap = new Map<string, string>();
    // Pick the first template for each sub_service
    templates?.forEach((t: any) => {
      if (!templateMap.has(t.sub_service_id)) {
        templateMap.set(t.sub_service_id, t.id);
      }
    });

    let inserted = 0;
    let skipped = 0;
    let failed = 0;
    const errors: TaskImportErrorEntry[] = [];

    for (const r of input.rows) {
      const taskInfo = `${r.client_name} - ${r.sub_service}`;
      if (r.errors.length > 0) {
        failed++;
        errors.push({ row_index: r.row_index, task_info: taskInfo, error: r.errors.join('; ') });
        continue;
      }

      // Match Client
      let clientId = r.client_pan ? clientPanMap.get(r.client_pan.toUpperCase()) : null;
      if (!clientId && r.client_name) {
        clientId = clientNameMap.get(r.client_name.toLowerCase().trim());
      }
      if (!clientId) {
        failed++;
        errors.push({ row_index: r.row_index, task_info: taskInfo, error: `Client not found: ${r.client_name} (PAN: ${r.client_pan || 'none'})` });
        continue;
      }

      // Match Sub Service
      const subServiceId = subServiceMap.get(r.sub_service?.toLowerCase().trim() || '');
      if (!subServiceId) {
        failed++;
        errors.push({ row_index: r.row_index, task_info: taskInfo, error: `Sub Service not found: ${r.sub_service}` });
        continue;
      }

      // Match Assignee
      let assigneeId: string | undefined = undefined;
      if (r.assignee) {
        assigneeId = assigneeMap.get(r.assignee.toLowerCase().trim());
        if (!assigneeId) {
            // We just warn or continue? Let's just not assign if not found, or maybe error. Let's error.
            failed++;
            errors.push({ row_index: r.row_index, task_info: taskInfo, error: `Assignee not found: ${r.assignee}` });
            continue;
        }
      }

      // Dynamic Linking: Link client to sub-service if not already linked
      const { data: existingLink } = await sb.from('client_sub_services').select('id')
        .eq('client_id', clientId).eq('sub_service_id', subServiceId).single();
      
      if (!existingLink) {
        await sb.from('client_sub_services').insert({
          client_id: clientId,
          sub_service_id: subServiceId,
          access_level: 'full',
          is_active: true
        });
      }

      // Automatically assign the first active task template
      const taskTemplateId = templateMap.get(subServiceId);

      // Uniform title generation across all creation paths
      let periodMonth: number | null = null;
      let periodQuarter: number | null = null;
      if (r.period) {
        const pNum = parseInt(r.period.replace(/\D/g, ''), 10);
        if (!isNaN(pNum)) {
          if (r.period.toLowerCase().includes('q')) {
            periodQuarter = pNum;
          } else {
            periodMonth = pNum;
          }
        }
      }
      const newTitle = buildTaskTitle({
        subServiceName: r.sub_service || 'Task',
        clientName: r.client_name,
        periodYear: r.period_year ? parseInt(r.period_year, 10) : null,
        periodMonth,
        periodQuarter,
      });

      // Create Task
      const payload: any = {
        client_id: clientId,
        sub_service_id: subServiceId,
        task_template_id: taskTemplateId || undefined,
        title: newTitle,
        priority: (r.priority || 'medium') as any,
        assigned_to: assigneeId,
        period_year: r.period_year ? parseInt(r.period_year, 10) : undefined,
      };

      // Period already parsed for title generation above
      if (periodMonth !== null) payload.period_month = periodMonth;
      if (periodQuarter !== null) payload.period_quarter = periodQuarter;

      // If due_date is provided
      if (r.due_date) {
        payload.due_date = r.due_date;
      } else {
        // createTaskSchema requires a due_date. If not provided, we can maybe default it to today + 7 days, or end of month?
        // Let's set it to today + 7 days if not provided, just so it creates.
        const d = new Date();
        d.setDate(d.getDate() + 7);
        payload.due_date = d.toISOString().split('T')[0];
      }

      const rAction = await createTaskAction(payload);
      if (rAction.success) {
        inserted++;
      } else {
        failed++;
        errors.push({ row_index: r.row_index, task_info: taskInfo, error: rAction.error || 'Task creation failed' });
      }
    }

    revalidatePath('/admin/tasks');
    revalidatePath('/team/tasks');
    return ok({ inserted, skipped, failed, errors });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}
