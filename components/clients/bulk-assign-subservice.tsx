'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { Layers } from 'lucide-react';
import { bulkLinkSubServiceAction } from '@/lib/actions/services';

interface Props {
  selectedClientIds: string[];
  onDone: () => void;
}

export default function BulkAssignSubService({ selectedClientIds, onDone }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [subServiceId, setSubServiceId] = useState('');
  const [subServices, setSubServices] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    if (loaded) return;
    try {
      const res = await fetch('/api/sub-services', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setSubServices(data.items ?? []);
      setLoaded(true);
    } catch {
      toast.error('Failed to load sub-services');
    }
  }

  function submit() {
    if (!subServiceId || selectedClientIds.length === 0) return;
    startTransition(async () => {
      const r = await bulkLinkSubServiceAction({ client_ids: selectedClientIds, sub_service_id: subServiceId });
      if (!r.success) {
        toast.error(r.error);
      } else {
        toast.success(`Linked ${r.data?.linked} client(s). Skipped ${r.data?.skipped} duplicate(s).`);
        setOpen(false);
        setSubServiceId('');
        onDone();
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) load(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={selectedClientIds.length === 0}>
          <Layers className="h-4 w-4 mr-1" /> Assign sub-service
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign sub-service to {selectedClientIds.length} client{selectedClientIds.length !== 1 ? 's' : ''}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-4">
          <Select value={subServiceId} onValueChange={setSubServiceId}>
            <SelectTrigger><SelectValue placeholder="Select sub-service..." /></SelectTrigger>
            <SelectContent>
              {subServices.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.code} — {s.name} ({s.frequency})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {subServices.length === 0 && <p className="text-xs text-zinc-500">Loading sub-services…</p>}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!subServiceId || pending}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
