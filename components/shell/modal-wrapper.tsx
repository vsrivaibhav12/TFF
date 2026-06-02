'use client';

import { useRouter } from 'next/navigation';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useState } from 'react';

export default function ModalWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setOpen(false);
      // Wait for the exit animation to finish before navigating back
      setTimeout(() => {
        router.back();
      }, 300);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[calc(100vw-88px)] !max-w-[calc(100vw-88px)] p-0 border-l border-zinc-200 bg-[#FAFAFA] sm:rounded-l-2xl shadow-2xl flex flex-col h-full overflow-hidden"
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}
