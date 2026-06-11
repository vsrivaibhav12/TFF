import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { ALL_CAPABILITIES, type Capability } from '@/lib/auth/capabilities';

/**
 * Return ONLY explicit deviation rows (overrides) from staff_capabilities.
 * This does NOT include template-derived capabilities.
 */
export async function listGrantedCapabilities(userId: string): Promise<Capability[]> {
  const sb = createClient();
  const { data } = await sb
    .from('staff_capabilities')
    .select('capability')
    .eq('user_id', userId)
    .is('revoked_at', null);
  return (data ?? []).map((r: any) => r.capability as Capability);
}

/**
 * Return the EFFECTIVE capability set: active template capabilities
 * merged with explicit deviations.
 */
export async function listEffectiveCapabilities(userId: string): Promise<Capability[]> {
  const sb = createClient();

  const { data: profile } = await sb
    .from('users_profile')
    .select('active_role_template_id')
    .eq('id', userId)
    .maybeSingle();

  const effective = new Set<string>();

  if (profile?.active_role_template_id) {
    const { data: templateCaps } = await sb
      .from('staff_role_template_capabilities')
      .select('capability')
      .eq('template_id', profile.active_role_template_id);
    for (const r of templateCaps ?? []) {
      effective.add((r as any).capability);
    }
  }

  const { data: deviations } = await sb
    .from('staff_capabilities')
    .select('capability, revoked_at')
    .eq('user_id', userId);

  for (const r of deviations ?? []) {
    if (r.revoked_at) {
      effective.delete((r as any).capability);
    } else {
      effective.add((r as any).capability);
    }
  }

  const valid = new Set<string>(ALL_CAPABILITIES);
  return [...effective].filter((c) => valid.has(c)) as Capability[];
}
