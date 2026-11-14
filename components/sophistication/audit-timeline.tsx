'use client';
import { formatDateIST } from '@/lib/utils';
import { FileEdit, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AuditEntry {
  id: string;
  action: string;
  field_name?: string;
  old_value?: any;
  new_value?: any;
  performed_by: { full_name: string; email: string };
  performed_at: string;
}

export default function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-500">No activity history found for this record.</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {entries.map((entry, idx) => (
          <li key={entry.id}>
            <div className="relative pb-8">
              {idx !== entries.length - 1 ? (
                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-100" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white",
                    entry.action.includes('create') ? "bg-teal-50 text-teal-600" :
                    entry.action.includes('update') ? "bg-blue-50 text-blue-600" :
                    entry.action.includes('delete') ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-600"
                  )}>
                    {entry.action.includes('create') ? <PlusCircle className="h-4 w-4" /> :
                     entry.action.includes('update') ? <FileEdit className="h-4 w-4" /> :
                     entry.action.includes('complete') ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-slate-500">
                      <span className="font-medium text-slate-900">{entry.performed_by.full_name}</span>{' '}
                      {entry.action.toLowerCase()}{' '}
                      {entry.field_name && (
                        <>
                          <span className="font-mono text-xs bg-slate-100 px-1 rounded">{entry.field_name}</span>
                          {entry.new_value && (
                            <span className="ml-1 text-slate-500">— set to <span className="text-slate-700 italic">&quot;{entry.new_value}&quot;</span></span>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="whitespace-nowrap text-right text-xs text-slate-500">
                    <time dateTime={entry.performed_at}>{formatDateIST(entry.performed_at)}</time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
