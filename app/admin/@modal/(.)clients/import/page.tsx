import ClientImportForm from '../../../clients/import/import-form';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { createClient } from '@/lib/supabase/server';
import { formatDateIST } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Upload } from 'lucide-react';
import EmptyState from '@/components/sophistication/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ModalWrapper from '@/components/shell/modal-wrapper';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getRecentBatches() {
  const sb = createClient();
  const { data } = await sb
    .from('client_import_batches')
    .select(
      'id, source_filename, total_rows, successful_rows, skipped_rows, error_rows, status, uploaded_at, users_profile:uploaded_by(full_name)',
    )
    .order('uploaded_at', { ascending: false })
    .limit(10);
  return data ?? [];
}

export default async function ClientImportModalIntercept() {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'clients.create');
  const batches = await getRecentBatches();
  
  return (
    <ModalWrapper>
      <div className="pt-8 px-4 sm:px-8 h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="mb-6">
          <h1 className="tff-page-title text-2xl font-bold">Bulk import clients</h1>
          <p className="tff-page-subtitle text-zinc-500">Upload a CSV or Excel file to import multiple clients at once.</p>
        </div>
        
        <ClientImportForm />

        <div className="max-w-5xl mt-12 pb-24">
          <h2 className="text-lg font-semibold mb-4">Recent imports</h2>
          {batches.length === 0 ? (
            <EmptyState
              title="No imports yet"
              body="Upload a CSV or Excel file to import clients in bulk."
              icon={<Upload className="h-6 w-6 text-zinc-400" />}
            />
          ) : (
            <div className="tff-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-zinc-50/50">
                    <TableHead>Date</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead className="text-right">Inserted</TableHead>
                    <TableHead className="text-right">Skipped</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-zinc-500">{formatDateIST(b.uploaded_at)}</TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/admin/clients/import/${b.id}`} className="hover:underline">
                          {b.source_filename ?? '—'}
                        </Link>
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {b.users_profile?.full_name ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">{b.successful_rows}</TableCell>
                      <TableCell className="text-right">{b.skipped_rows}</TableCell>
                      <TableCell className="text-right">{b.error_rows}</TableCell>
                      <TableCell>
                        <Badge variant={b.status === 'completed' ? 'success' : 'outline'}>
                          {b.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}
