import { parseParams, IdParamSchema } from '@/lib/validation/params';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/require-role';

export const dynamic = 'force-dynamic';

export default async function AdminTeamMemberPage({ params }: { params: { id: string } }) {
  const { id } = parseParams(params, IdParamSchema);
  const sb = createClient();
  const currentUser = await getCurrentUser();
  const { data: user } = await sb
    .from('users_profile')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (!user) notFound();

  redirect(`/admin/team?dock=team:${id}`);
}
