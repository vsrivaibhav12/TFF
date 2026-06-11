'use client';

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ClientCreateForm } from '@/app/admin/clients/client-create-form';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Props {
  groups: { id: string; name: string }[];
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline';
}

export default function NewClientDialog({ groups, triggerLabel = 'New client', triggerVariant = 'default' }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Wrap the form's onSubmit to handle dialog closure
  const handleSuccess = (clientId?: string) => {
    setOpen(false);
    toast.success('Client created');
    router.refresh();
    if (clientId) {
      // Open the new client in the dock
      const params = new URLSearchParams(window.location.search);
      params.set('dock', `client:${clientId}`);
      router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} data-testid="client-new">
          <Plus className="h-4 w-4 mr-1" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
        </DialogHeader>
        <ClientCreateForm groups={groups} onSuccess={handleSuccess} onCancel={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}


