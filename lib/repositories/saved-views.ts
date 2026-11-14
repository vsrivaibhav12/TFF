import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { SavedViewInput, SavedViewScope, TableLayout } from '@/lib/services/saved-views';

export type SavedViewRow = {
  id: string;
  owner_id: string;
  owner_name: string | null;
  scope: SavedViewScope;
  name: string;
  query: string;
  layout: TableLayout;
  is_shared: boolean;
};

/** The person's own views and the views shared with everyone. Row level security decides which rows come back. */
export async function listSavedViews(scope: SavedViewScope, currentUserId?: string): Promise<SavedViewRow[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from('saved_views')
    .select('id, owner_id, scope, name, query, layout, is_shared')
    .eq('scope', scope)
    .order('name', { ascending: true })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []) as any[];

  // Owner names are needed only for views other people shared, so most pages skip this second query.
  const otherOwners = [...new Set(rows.filter((r) => r.owner_id !== currentUserId).map((r) => r.owner_id as string))];
  const names = new Map<string, string>();
  if (otherOwners.length > 0) {
    const { data: people } = await sb.from('users_profile').select('id, full_name').in('id', otherOwners);
    for (const p of people ?? []) names.set(p.id as string, (p.full_name as string) ?? '');
  }

  return rows.map((r) => ({
    id: r.id,
    owner_id: r.owner_id,
    owner_name: names.get(r.owner_id) ?? null,
    scope: r.scope,
    name: r.name,
    query: r.query ?? '',
    layout: (r.layout ?? { order: [], visible: {} }) as TableLayout,
    is_shared: !!r.is_shared,
  }));
}

/** Saves a view under the person's own name. Saving the same name again replaces it. */
export async function upsertSavedView(ownerId: string, input: SavedViewInput): Promise<string> {
  const sb = createClient();
  const { data, error } = await sb
    .from('saved_views')
    .upsert(
      { owner_id: ownerId, scope: input.scope, name: input.name, query: input.query, layout: input.layout, is_shared: input.is_shared, updated_at: new Date().toISOString() },
      { onConflict: 'owner_id,scope,name' },
    )
    .select('id');
  if (error) throw error;
  // Row level security turns a refused write into zero rows, not an error, so check that a row came back.
  if (!data || data.length === 0) throw new Error('The view could not be saved');
  return data[0].id as string;
}

/** Deletes one view. Returns false when nothing was deleted (not yours, or already gone). */
export async function deleteSavedView(id: string): Promise<boolean> {
  const sb = createClient();
  const { data, error } = await sb.from('saved_views').delete().eq('id', id).select('id');
  if (error) throw error;
  return (data ?? []).length > 0;
}
