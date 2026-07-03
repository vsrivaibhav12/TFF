import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/require-role';
import { listClientSubServices } from '@/lib/repositories/client-sub-services';
import { getClientById } from '@/lib/repositories/clients';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ items: [], client: null }, { status: 401 });
  const [items, client] = await Promise.all([
    listClientSubServices(params.id),
    getClientById(params.id),
  ]);
  return NextResponse.json({ items, client: client ? { id: client.id, business_name: client.business_name, pan: client.pan } : null });
}
