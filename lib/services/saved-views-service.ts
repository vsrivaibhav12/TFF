import 'server-only';
import { ServiceError } from '@/lib/actions/result';
import * as repo from '@/lib/repositories/saved-views';
import { parseSavedViewInput } from '@/lib/services/saved-views';

/** Validates and saves a view under the person's own name. Throws ServiceError on bad input. */
export async function saveView(ownerId: string, raw: Parameters<typeof parseSavedViewInput>[0]): Promise<string> {
  const parsed = parseSavedViewInput(raw);
  if (!parsed.ok) throw new ServiceError(parsed.error, 'VALIDATION');
  return repo.upsertSavedView(ownerId, parsed.value);
}

/** Deletes a view. Throws ServiceError when it is not the person's own (an admin may delete any). */
export async function removeView(id: string): Promise<void> {
  const deleted = await repo.deleteSavedView(id);
  if (!deleted) throw new ServiceError('You can only delete your own views', 'NOT_ALLOWED');
}
