'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { ALL_CAPABILITIES, type Capability } from '@/lib/auth/capabilities';
import { requireCapability } from '@/lib/auth/require-capability';
import { writeAudit } from '@/lib/services/audit-service';
import { ok, fail, type ActionResult } from '@/lib/actions/result';
import { notify } from '@/lib/services/notification-service';

/**
 * Set explicit capability deviations (overrides) for a user.
 *
 * The full desired capability set is provided. We compare it against the
 * user's active role template to compute deviations:
 *   - Capabilities in selected but NOT in template  → granted overrides
 *   - Capabilities in template but NOT in selected  → revoked overrides
 *   - Capabilities in both template and selected    → no row needed (derived)
 *
 * Only deviations are stored in staff_capabilities.
 */
export async function setUserCapabilityOverridesAction(input: {
  user_id: string;
  capabilities: Capability[];
}): Promise<ActionResult<{ granted: number; revoked: number }>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'staff.grant_capabilities');

    // Validate capability strings against the closed list
    const valid = new Set<string>(ALL_CAPABILITIES);
    for (const c of input.capabilities) {
      if (!valid.has(c)) return fail(`Unknown capability: ${c}`, 'VALIDATION');
    }

    const sb = createClient();

    // Fetch active template capabilities
    const { data: profile } = await sb
      .from('users_profile')
      .select('active_role_template_id')
      .eq('id', input.user_id)
      .maybeSingle();

    let templateCaps = new Set<string>();
    if (profile?.active_role_template_id) {
      const { data: tCaps } = await sb
        .from('staff_role_template_capabilities')
        .select('capability')
        .eq('template_id', profile.active_role_template_id);
      templateCaps = new Set((tCaps ?? []).map((r: any) => r.capability));
    }

    const target = new Set<string>(input.capabilities);

    // Load existing deviation rows for this user
    const { data: existing } = await sb
      .from('staff_capabilities')
      .select('id, capability, revoked_at')
      .eq('user_id', input.user_id);

    const known: Record<string, { id: string; revoked: boolean }> = {};
    for (const r of existing ?? []) {
      known[(r as any).capability] = { id: (r as any).id, revoked: !!(r as any).revoked_at };
    }

    // Compute deviations
    const toGrant = new Set<string>();
    const toRevoke = new Set<string>();

    for (const cap of target) {
      const row = known[cap];
      if (templateCaps.has(cap)) {
        // Template capability that is selected → reactivate if revoked
        if (row?.revoked) toGrant.add(cap);
      } else {
        // Non-template capability that is selected → grant if not already granted
        if (!row || row.revoked) toGrant.add(cap);
      }
    }

    for (const cap of templateCaps) {
      if (!target.has(cap)) {
        // Template capability that is deselected → revoke if not already revoked
        const row = known[cap];
        if (!row || !row.revoked) toRevoke.add(cap);
      }
    }

    for (const cap of Object.keys(known)) {
      if (!target.has(cap) && !templateCaps.has(cap) && !known[cap].revoked) {
        // Explicit grant that is deselected → revoke
        toRevoke.add(cap);
      }
    }

    // Grants: insert or re-activate
    for (const cap of toGrant) {
      const row = known[cap];
      if (row?.revoked) {
        await sb
          .from('staff_capabilities')
          .update({ revoked_at: null, revoked_by: null, granted_at: new Date().toISOString(), granted_by: me.id })
          .eq('id', row.id);
      } else if (!row) {
        await sb.from('staff_capabilities').insert({
          user_id: input.user_id,
          capability: cap,
          granted_by: me.id,
        });
      }
      await writeAudit({
        action: 'capability.grant',
        entity_type: 'user',
        entity_id: input.user_id,
        performed_by: me.id,
        details: { capability: cap },
      });
    }

    // Revokes: set revoked_at (insert if no row exists)
    for (const cap of toRevoke) {
      const row = known[cap];
      if (row?.revoked) continue;
      if (row) {
        await sb
          .from('staff_capabilities')
          .update({ revoked_at: new Date().toISOString(), revoked_by: me.id })
          .eq('id', row.id);
      } else {
        await sb.from('staff_capabilities').insert({
          user_id: input.user_id,
          capability: cap,
          granted_by: me.id,
          revoked_at: new Date().toISOString(),
          revoked_by: me.id,
        });
      }
      await writeAudit({
        action: 'capability.revoke',
        entity_type: 'user',
        entity_id: input.user_id,
        performed_by: me.id,
        details: { capability: cap },
      });
    }

    // Clean up redundant grants (capabilities that are now in the template and explicitly granted)
    for (const cap of target) {
      if (templateCaps.has(cap) && known[cap] && !known[cap].revoked) {
        await sb.from('staff_capabilities').delete().eq('id', known[cap].id);
      }
    }

    if (toGrant.size || toRevoke.size) {
      await notify({
        user_id: input.user_id,
        type: 'team_alert',
        title: 'Your access was updated',
        message: `Capabilities updated by ${me.full_name ?? me.email}: +${toGrant.size} granted, -${toRevoke.size} revoked.`,
      });
    }

    revalidatePath(`/admin/team/${input.user_id}`);
    revalidatePath(`/admin/team/${input.user_id}/capabilities`);
    return ok({ granted: toGrant.size, revoked: toRevoke.size });
  } catch (e: any) {
    return fail(e?.message ?? 'unknown', e?.code ?? 'UNKNOWN');
  }
}

/**
 * @deprecated Use setUserCapabilityOverridesAction instead.
 * Kept for backward compatibility during transition.
 */
export async function setUserCapabilitiesAction(input: {
  user_id: string;
  capabilities: Capability[];
}): Promise<ActionResult<{ granted: number; revoked: number }>> {
  return setUserCapabilityOverridesAction(input);
}
