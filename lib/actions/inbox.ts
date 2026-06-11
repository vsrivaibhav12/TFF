'use server';

import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { transitionTaskAction } from './tasks';
import { updateNoticeStatusAction } from './notices';
import { updateQueryStatusAction } from './queries';
import { ok, fail, type ActionResult } from './result';

const resolveItemSchema = z.object({
  item_type: z.enum(['task', 'notice', 'query', 'compliance']),
  item_id: z.string().uuid(),
});

export async function resolveInboxItemAction(
  input: z.infer<typeof resolveItemSchema>
): Promise<ActionResult<void>> {
  await requireRole(['admin', 'team']);

  const parsed = resolveItemSchema.safeParse(input);
  if (!parsed.success) {
    return fail('Invalid input');
  }

  const { item_type, item_id } = parsed.data;

  try {
    switch (item_type) {
      case 'task': {
        const r = await transitionTaskAction({
          task_id: item_id,
          to_status: 'completed',
        });
        if (!r.success) return fail(r.error);
        return ok(undefined);
      }
      case 'notice': {
        const r = await updateNoticeStatusAction({
          id: item_id,
          status: 'closed',
        });
        if (!r.success) return fail(r.error);
        return ok(undefined);
      }
      case 'query': {
        const r = await updateQueryStatusAction({
          query_id: item_id,
          status: 'resolved',
        });
        if (!r.success) return fail(r.error);
        return ok(undefined);
      }
      case 'compliance': {
        // Compliance events are handled via the compliance calendar
        return fail('Compliance events must be handled via the compliance calendar', 'COMPLIANCE_VIA_CALENDAR');
      }
      default:
        return fail('Unknown item type');
    }
  } catch (e: any) {
    return fail(e.message ?? 'Failed to resolve item');
  }
}
