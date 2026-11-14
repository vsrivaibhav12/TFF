'use server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import { ok, fail, ServiceError, type ActionResult } from '@/lib/actions/result';
import { saveView, removeView } from '@/lib/services/saved-views-service';

// No capability gate on purpose: every staff member (admin or team) may keep their own saved views and share them.
// Row level security still limits each write to the owner (an admin may also delete any view).

const inputSchema = z.object({
  scope: z.string(),
  name: z.string(),
  query: z.string().max(2000).optional().default(''),
  layout: z.unknown().optional(),
  is_shared: z.boolean().optional().default(false),
});

export async function saveSavedViewAction(input: z.input<typeof inputSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    const shape = inputSchema.safeParse(input);
    if (!shape.success) return fail('That view could not be read', 'VALIDATION');
    return ok({ id: await saveView(me.id, shape.data) });
  } catch (e) {
    if (e instanceof ServiceError) return fail(e.message, e.code);
    return fail('Could not save the view', 'SAVE_FAILED');
  }
}

export async function deleteSavedViewAction(id: string): Promise<ActionResult<void>> {
  try {
    await requireRole(['admin', 'team']);
    if (!z.string().uuid().safeParse(id).success) return fail('That view could not be found', 'VALIDATION');
    await removeView(id);
    return ok(undefined);
  } catch (e) {
    if (e instanceof ServiceError) return fail(e.message, e.code);
    return fail('Could not delete the view', 'DELETE_FAILED');
  }
}
