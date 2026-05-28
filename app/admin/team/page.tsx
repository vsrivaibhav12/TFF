import { requireRole } from '@/lib/auth/require-role';
import Link from 'next/link';
import { listTeamUsers } from '@/lib/repositories/clients';
import { PageHeader } from '@/components/ui/page-header';
import ExportButton from '@/components/sophistication/export-button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Users } from 'lucide-react';
import NewTeamMemberDialog from './new-member-dialog';
import RemoveMemberButton from './remove-member-button';
import EmptyState from '@/components/sophistication/empty-state';

export const dynamic = 'force-dynamic';

export default async function AdminTeamPage() {
  await requireRole('admin');
  const team = await listTeamUsers();
  const managerMap = new Map(team.map((u: any) => [u.id, u.full_name]));

  const exportData = (team ?? []).map((u: any) => ({
    name: u.full_name,
    email: u.email,
    role: u.role,
    manager: u.reports_to ? managerMap.get(u.reports_to) ?? '' : '',
    status: u.is_active ? 'Active' : 'Inactive',
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        subtitle="Internal users with admin or team role. Create an account with admin-assigned credentials."
        actions={
          <>
            <ExportButton data={exportData} filename="team-export" format="csv" />
            <Button variant="outline" asChild data-testid="manage-roles-btn">
              <Link href="/admin/team/roles">
                <ShieldCheck className="h-4 w-4 mr-1" /> Role templates
              </Link>
            </Button>
            <NewTeamMemberDialog team={team.map((u: any) => ({ id: u.id, full_name: u.full_name, email: u.email }))} />
          </>
        }
      />
      <div className="tff-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="p-0"><EmptyState title="No team members" body="Create the first team member to get started." actionHref="/admin/team" actionLabel="Create member" icon={<Users className="h-6 w-6 text-zinc-400" />} /></TableCell></TableRow>
            ) : (team.map((u: any) => (
              <TableRow key={u.id} className="cursor-pointer hover:bg-zinc-50">
                <TableCell className="font-medium">
                  <Link href={`/admin/team/${u.id}`} className="hover:underline" data-testid={`team-row-${u.id}`}>
                    {u.full_name}
                  </Link>
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === 'admin' ? 'teal' : 'outline'}>{u.role}</Badge>
                </TableCell>
                <TableCell className="text-sm text-zinc-500">
                  {u.reports_to ? managerMap.get(u.reports_to) ?? '—' : '—'}
                </TableCell>
                <TableCell>
                  {u.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="warning">Inactive</Badge>}
                </TableCell>
                <TableCell>
                  <RemoveMemberButton userId={u.id} isPrimeAdmin={u.is_prime_admin} />
                </TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
