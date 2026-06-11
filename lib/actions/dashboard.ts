'use server';

import { requireRole } from '@/lib/auth/require-role';
import { getAdminDashboardData } from '@/lib/services/dashboard-service';
import { ok, fail } from '@/lib/actions/result';

export async function getAdminDashboardAction() {
  try {
    await requireRole('admin');
    const data = await getAdminDashboardData();
    return ok(data);
  } catch (e: any) {
    return fail(e.message);
  }
}
