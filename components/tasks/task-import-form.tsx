'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRolePrefix } from '@/lib/hooks/use-role-prefix';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  previewTaskImportAction,
  commitTaskImportAction,
  type TaskImportPreview,
} from '@/lib/actions/task-import';

export default function TaskImportForm() {
  const router = useRouter();
  const prefix = useRolePrefix();
  const [preview, setPreview] = useState<TaskImportPreview | null>(null);
  const [pending, startTransition] = useTransition();

  function onUploadPreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await previewTaskImportAction(fd);
      if (!r.success) { toast.error(r.error); return; }
      setPreview(r.data);
      toast.success(`Parsed ${r.data.summary.total} row${r.data.summary.total === 1 ? '' : 's'}`);
    });
  }

  function commit() {
    if (!preview) return;
    const ready = preview.rows.filter((r) => r.errors.length === 0);
    if (ready.length === 0) { toast.error('No valid rows to import'); return; }
    startTransition(async () => {
      const r = await commitTaskImportAction({
        file_name: preview.fileName,
        rows: preview.rows,
      });
      if (!r.success) { toast.error(r.error); return; }
      toast.success(
        `Imported ${(r as any).data.inserted} task${(r as any).data.inserted === 1 ? '' : 's'} · skipped ${(r as any).data.skipped} · failed ${(r as any).data.failed}`,
      );
      setPreview(null);
      router.push(`${prefix}/tasks`);
    });
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <Link href={`${prefix}/tasks`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="h-4 w-4" /> Tasks
      </Link>

      <div>
        <h1 className="tff-page-title">Bulk import tasks</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Upload a CSV or Excel file to create tasks in bulk. We will automatically link clients to sub-services if missing, and attach the active task template.
        </p>
      </div>

      {!preview && (
        <div className="tff-card tff-card-pad space-y-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="h-5 w-5 text-teal-600 mt-0.5" />
            <div className="text-sm space-y-2">
              <p className="font-medium">Expected columns (any order, case-insensitive):</p>
              <code className="block rounded bg-zinc-50 border border-zinc-200 p-3 text-xs leading-relaxed">
                Client Name <span className="text-zinc-400">(required)</span>, Client PAN, Sub Service Code/Name <span className="text-zinc-400">(required)</span>,
                Assignee Name, Priority, Year, Period
              </code>
              <p className="text-zinc-500 text-xs">
                <strong>Priority</strong> must be one of: low, medium, high, urgent.
              </p>
            </div>
          </div>
          <form onSubmit={onUploadPreview} className="flex items-center gap-3 pt-2">
            <Input type="file" name="file" accept=".csv,.xlsx,.xls" required className="max-w-md" />
            <Button type="submit" disabled={pending}>
              <Upload className="h-4 w-4 mr-1" /> Preview
            </Button>
          </form>
        </div>
      )}

      {/* Preview / commit */}
      {preview && (
        <div className="space-y-4">
          <div className="tff-card tff-card-pad">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{preview.fileName}</h3>
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {preview.summary.ready} ready
                </Badge>
                {preview.summary.error > 0 && (
                  <Badge variant="warning" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> {preview.summary.error} with errors
                  </Badge>
                )}
                <span className="text-sm text-zinc-500">{preview.summary.total} total</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPreview(null)} disabled={pending}>
                  Cancel
                </Button>
                <Button onClick={commit} disabled={pending || preview.summary.ready === 0}>
                  {pending ? 'Importing…' : `Import ${preview.summary.ready} task${preview.summary.ready === 1 ? '' : 's'}`}
                </Button>
              </div>
            </div>
          </div>

          <div className="tff-card overflow-hidden">
            <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
              <Table className="w-full text-sm">
                <TableHeader className="bg-zinc-50 sticky top-0">
                  <TableRow className="text-left text-zinc-500 hover:bg-zinc-50">
                    <TableHead className="px-3 py-2 font-medium">Row</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Client Name</TableHead>
                    <TableHead className="px-3 py-2 font-medium">PAN</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Sub Service</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Assignee</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Priority</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Year</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Period</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((r: any) => {
                    const hasErr = r.errors.length > 0;
                    return (
                      <TableRow key={r.row_index} className={hasErr ? 'bg-amber-50/40' : ''}>
                        <TableCell className="px-3 py-2 text-zinc-400 align-top">{r.row_index}</TableCell>
                        <TableCell className="px-3 py-2 font-medium align-top">{r.client_name || '—'}</TableCell>
                        <TableCell className="px-3 py-2 text-zinc-600 align-top font-mono text-xs">{r.client_pan || '—'}</TableCell>
                        <TableCell className="px-3 py-2 text-zinc-600 align-top">{r.sub_service || '—'}</TableCell>
                        <TableCell className="px-3 py-2 text-zinc-600 align-top">{r.assignee || '—'}</TableCell>
                        <TableCell className="px-3 py-2 text-zinc-600 align-top">{r.priority || '—'}</TableCell>
                        <TableCell className="px-3 py-2 text-zinc-600 align-top">{r.period_year || '—'}</TableCell>
                        <TableCell className="px-3 py-2 text-zinc-600 align-top">{r.period || '—'}</TableCell>
                        <TableCell className="px-3 py-2 align-top">
                          {hasErr ? (
                            <span className="text-xs text-amber-700">{r.errors.join('; ')}</span>
                          ) : (
                            <Badge variant="success" className="text-[10px]">ready</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
