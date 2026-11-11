import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/require-role';
import { listClientSubServices } from '@/lib/repositories/client-sub-services';
import { getClientById } from '@/lib/repositories/clients';
import { getClientGstFrequency } from '@/lib/repositories/periods';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ items: [], client: null }, { status: 401 });
  const [items, client, gstFrequency] = await Promise.all([
    listClientSubServices(params.id),
    getClientById(params.id),
    getClientGstFrequency(params.id),
  ]);
  return NextResponse.json({ items, gstFrequency, client: client ? { id: client.id, business_name: client.business_name, pan: client.pan } : null });
}
