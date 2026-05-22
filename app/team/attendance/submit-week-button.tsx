'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { submitWeekForApprovalAction } from '@/lib/actions/weekly-approval';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Send } from 'lucide-react';

interface Props {
  weekStart: string;
  weekEnd: string;
  currentStatus?: string | null;
}

export default function SubmitWeekButton({ weekStart, weekEnd, currentStatus }: Props) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(currentStatus);

  if (status === 'submitted') {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        <Send className="h-4 w-4" />
        Timesheet submitted for approval
      </div>
    );
  }
  if (status === 'approved') {
    return (
      <div className="flex items-center gap-2 text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
        <CheckCircle2 className="h-4 w-4" />
        Timesheet approved
      </div>
    );
  }

  function submit() {
    startTransition(async () => {
      const r = await submitWeekForApprovalAction({ week_start: weekStart, week_end: weekEnd });
      if (r.success) {
        toast.success('Weekly timesheet submitted for approval');
        setStatus('submitted');
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Button variant="outline" onClick={submit} disabled={pending} className="gap-2">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      Submit week for approval
    </Button>
  );
}
