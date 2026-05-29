'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { linkSubServiceAction } from '@/lib/actions/services';

interface Props {
  subServiceId: string;
  allClients: { id: string; business_name: string }[];
  linkedClientIds: string[];
}

export default function LinkClientForm({ subServiceId, allClients, linkedClientIds }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [pending, startTransition] = useTransition();

  const available = allClients.filter((c) => !linkedClientIds.includes(c.id));

  function link() {
    if (!selected) return;
    startTransition(async () => {
      const r = await linkSubServiceAction({ client_id: selected, sub_service_id: subServiceId });
      if (!r.success) toast.error(r.error);
      else {
        toast.success('Client linked');
        setOpen(false);
        setSelected('');
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
          <Plus className="h-4 w-4 mr-1" /> Link client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Link client to this sub-service</DialogTitle></DialogHeader>
        <div className="space-y-3 py-4">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
            <SelectContent>
              {available.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {available.length === 0 && (
            <p className="text-xs text-zinc-500">All clients are already linked to this sub-service.</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={link} disabled={!selected || pending}>Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
