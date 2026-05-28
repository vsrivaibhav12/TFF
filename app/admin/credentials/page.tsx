import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import Link from 'next/link';
import { listCredentials } from '@/lib/repositories/credentials';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { PageHeader } from '@/components/ui/page-header';
import ExportButton from '@/components/sophistication/export-button';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import CredentialDialog from './credential-dialog';
import CredentialReveal from './credential-reveal';
import { formatDateIST } from '@/lib/utils';
import { ExternalLink, KeyRound } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';

export const dynamic = 'force-dynamic';

export default async function CredentialsPage() {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'credentials.manage');
  const [items, clients] = await Promise.all([listCredentials(), listAccessibleClients()]);

  const exportData = (items ?? []).map((c: any) => ({
    client: c.clients?.business_name ?? '',
    portal: c.portal_name,
    username: c.username,
    last_used: c.last_used_date ?? '',
    status: c.is_active ? 'active' : 'inactive',
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credentials Vault"
        subtitle="Encrypted (AES-GCM). Every reveal is audited."
        actions={
          <>
            <ExportButton data={exportData} filename="credentials-export" format="csv" />
            <CredentialDialog clients={clients as any}><Button data-testid="cred-new">New credential</Button></CredentialDialog>
          </>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          title="No credentials yet"
          body="Add a portal login to start tracking firm-wide access. Every reveal is audited."
          icon={<KeyRound className="h-6 w-6 text-zinc-400" />}
        />
      ) : (
        <div className="tff-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead><TableHead>Portal</TableHead>
                <TableHead>Username</TableHead><TableHead>Last used</TableHead>
                <TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c: any) => (
                <TableRow key={c.id} data-testid={`cred-row-${c.id}`}>
                  <TableCell className="font-medium">{c.clients?.business_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">{c.portal_name}
                      {c.portal_url && <Link href={c.portal_url} target="_blank" className="text-zinc-400 hover:text-[#0D9488]"><ExternalLink className="h-3 w-3" /></Link>}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{c.username}</TableCell>
                  <TableCell>{c.last_used_date ? formatDateIST(c.last_used_date) : <span className="text-zinc-400">never</span>}</TableCell>
                  <TableCell>{c.is_active ? <Badge variant="success">active</Badge> : <Badge variant="outline">inactive</Badge>}</TableCell>
                  <TableCell className="flex items-center gap-3">
                    <CredentialReveal id={c.id} />
                    <CredentialDialog key={c.id} clients={clients as any} initial={c}><button className="text-xs text-[#0D9488] hover:underline font-medium">Edit</button></CredentialDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      )}
    </div>
  );
}
