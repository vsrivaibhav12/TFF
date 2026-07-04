import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface RoleTemplate {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  capabilities: string[];
  staff_count: number;
}

interface RoleTemplateRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface CapRow {
  template_id: string;
  capability: string;
}

interface ProfileRow {
  active_role_template_id: string | null;
}

/**
 * List all active role templates with their capabilities and how many staff
 * currently have each template applied.
 */
export async function listRoleTemplates(): Promise<RoleTemplate[]> {
  const sb = createClient();
  const { data: rows, error } = await sb
    .from('staff_role_templates')
    .select('id, name, description, created_at, updated_at, is_deleted')
    .eq('is_deleted', false)
    .order('name', { ascending: true })
    .returns<RoleTemplateRow[]>();
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const caps: CapRow[] = [];
  const profiles: ProfileRow[] = [];
  const BATCH_SIZE = 100;

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const [{ data: capBatch }, { data: profBatch }] = await Promise.all([
      sb.from('staff_role_template_capabilities').select('template_id, capability').in('template_id', batch).returns<CapRow[]>(),
      sb.from('users_profile').select('active_role_template_id').in('active_role_template_id', batch).returns<ProfileRow[]>(),
    ]);
    caps.push(...(capBatch ?? []));
    profiles.push(...(profBatch ?? []));
  }

  const capMap: Record<string, string[]> = {};
  for (const c of caps) {
    capMap[c.template_id] = capMap[c.template_id] ?? [];
    capMap[c.template_id].push(c.capability);
  }
  const staffCount: Record<string, number> = {};
  for (const p of profiles) {
    const k = p.active_role_template_id;
    if (k) staffCount[k] = (staffCount[k] ?? 0) + 1;
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    created_at: r.created_at,
    updated_at: r.updated_at,
    capabilities: capMap[r.id] ?? [],
    staff_count: staffCount[r.id] ?? 0,
  }));
}

export async function getRoleTemplate(id: string): Promise<RoleTemplate | null> {
  const sb = createClient();
  const { data: row, error } = await sb
    .from('staff_role_templates')
    .select('id, name, description, created_at, updated_at')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()
    .returns<RoleTemplateRow>();
  if (error) throw error;
  if (!row) return null;
  const { data: caps } = await sb
    .from('staff_role_template_capabilities')
    .select('capability')
    .eq('template_id', id)
    .returns<Array<{ capability: string }>>();
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    created_at: row.created_at,
    updated_at: row.updated_at,
    capabilities: (caps ?? []).map((c) => c.capability),
    staff_count: 0,
  };
}
