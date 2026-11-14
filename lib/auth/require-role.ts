import 'server-only';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/current-user';

export type AppRole = 'admin' | 'team';

export interface AppUser {
  id: string;
  email: string;
  role: AppRole;
  full_name: string | null;
  is_active: boolean;
  is_prime_admin?: boolean;
}

export { getCurrentUser };

export async function requireUser(): Promise<AppUser> {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  return u;
}

export async function requireRole(allowed: AppRole | AppRole[]): Promise<AppUser> {
  const user = await requireUser();
  const allowedArr = Array.isArray(allowed) ? allowed : [allowed];
  if (!allowedArr.includes(user.role)) {
    redirect(`/${user.role}`);
  }
  return user;
}
