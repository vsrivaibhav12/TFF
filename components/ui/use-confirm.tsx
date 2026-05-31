'use client';
import { useState, useCallback } from 'react';
import { ConfirmDialog } from './confirm-dialog';

export function useConfirm() {
  const [promise, setPromise] = useState<{ resolve: (value: boolean) => void } | null>(null);
  const [opts, setOpts] = useState<{ title: string; description: string; confirmText?: string; cancelText?: string; isDestructive?: boolean } | null>(null);

  const confirm = useCallback((options: { title: string; description: string; confirmText?: string; cancelText?: string; isDestructive?: boolean }) => {
    return new Promise<boolean>((resolve) => {
      setOpts(options);
      setPromise({ resolve });
    });
  }, []);

  const handleClose = () => {
    setPromise(null);
  };

  const handleConfirm = () => {
    promise?.resolve(true);
    handleClose();
  };

  const handleCancel = () => {
    promise?.resolve(false);
    handleClose();
  };

  const ConfirmationDialog = () => (
    <ConfirmDialog
      open={promise !== null}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
      title={opts?.title || ''}
      description={opts?.description || ''}
      confirmText={opts?.confirmText}
      cancelText={opts?.cancelText}
      isDestructive={opts?.isDestructive}
      onConfirm={handleConfirm}
    />
  );

  return [ConfirmationDialog, confirm] as const;
}
