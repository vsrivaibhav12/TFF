'use client';
import { useState, useTransition, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { upsertDscAction, deleteDscAction } from '@/lib/actions/dsc';
import { uploadDscCertificateAction, getDscCertificateUrlAction } from '@/lib/actions/dsc-upload';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/use-confirm';
import { Trash2, Upload, Download } from 'lucide-react';

interface DscDialogProps {
  clients: { id: string; business_name: string }[];
  initial?: {
    id?: string;
    client_id?: string;
    holder_name?: string;
    holder_contact_email?: string;
    dsc_class?: string;
    dsc_type?: string;
    certificate_serial?: string;
    certificate_issuer?: string;
    issued_date?: string;
    expiry_date?: string;
    status?: string;
    custodian_name?: string;
    physical_location?: string;
    certificate_file_name?: string | null;
  };
  children: React.ReactNode;
}

export default function DscDialog({ clients, initial, children }: DscDialogProps) {
  const [open, setOpen] = useState(false);
  const [ConfirmDialog, confirm] = useConfirm();
  const [pending, startTransition] = useTransition();
  const [uploadPending, startUpload] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    id: initial?.id ?? undefined,
    client_id: initial?.client_id ?? '',
    holder_name: initial?.holder_name ?? '',
    holder_contact_email: initial?.holder_contact_email ?? '',
    dsc_class: initial?.dsc_class ?? 'Class 3',
    dsc_type: initial?.dsc_type ?? 'eToken',
    certificate_serial: initial?.certificate_serial ?? '',
    certificate_issuer: initial?.certificate_issuer ?? '',
    issued_date: initial?.issued_date ?? '',
    expiry_date: initial?.expiry_date ?? '',
    status: initial?.status ?? 'active',
    custodian_name: initial?.custodian_name ?? '',
    physical_location: initial?.physical_location ?? '',
    pin: '',
    password: '',
  });
  const [fileName, setFileName] = useState(initial?.certificate_file_name ?? '');

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function save() {
    startTransition(async () => {
      const r = await upsertDscAction(form as any);
      if (r.success) { toast.success('Saved'); setOpen(false); }
      else toast.error(r.error);
    });
  }

  async function remove() {
    if (!form.id) return;
    const ok = await confirm({ title: 'Delete DSC', description: 'Delete this DSC record?' });
    if (!ok) return;
    startTransition(async () => {
      const r = await deleteDscAction(form.id!);
      if (r.success) { toast.success('Deleted'); setOpen(false); }
      else toast.error(r.error);
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !form.id) return;
    startUpload(async () => {
      const r = await uploadDscCertificateAction(form.id!, file);
      if (r.success) {
        setFileName(r.data.name);
        toast.success('Certificate uploaded');
      } else {
        toast.error(r.error);
      }
    });
  }

  function downloadCertificate() {
    const id = form.id;
    if (!id) return;
    startUpload(async () => {
      const r = await getDscCertificateUrlAction(id);
      if (r.success) {
        const a = document.createElement('a');
        a.href = r.data.url;
        a.download = r.data.name ?? 'certificate';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <>
      <ConfirmDialog />
      <Dialog open={open} onOpenChange={(val) => {setOpen(val)}}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{initial ? 'Edit DSC' : 'New DSC'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Client *</Label>
            <Select value={form.client_id} onValueChange={(v) => set('client_id', v)}>
              <SelectTrigger data-testid="dsc-client"><SelectValue placeholder="Select client…" /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Holder name *</Label><Input value={form.holder_name} onChange={(e) => set('holder_name', e.target.value)} /></div>
            <div className="space-y-2"><Label>Holder email</Label><Input type="email" value={form.holder_contact_email} onChange={(e) => set('holder_contact_email', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Class</Label>
              <Select value={form.dsc_class} onValueChange={(v) => set('dsc_class', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Class 2">Class 2</SelectItem><SelectItem value="Class 3">Class 3</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={form.dsc_type} onValueChange={(v) => set('dsc_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="eSign">eSign</SelectItem><SelectItem value="eToken">eToken</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Issued</Label><Input type="date" value={form.issued_date} onChange={(e) => set('issued_date', e.target.value)} /></div>
            <div className="space-y-2"><Label>Expiry *</Label><Input type="date" value={form.expiry_date} onChange={(e) => set('expiry_date', e.target.value)} data-testid="dsc-expiry" /></div>
          </div>
          <div className="space-y-2"><Label>Certificate serial</Label><Input value={form.certificate_serial} onChange={(e) => set('certificate_serial', e.target.value)} /></div>
          <div className="space-y-2"><Label>Certificate issuer</Label><Input value={form.certificate_issuer} onChange={(e) => set('certificate_issuer', e.target.value)} /></div>

          {initial?.id && (
            <div className="border border-zinc-200 rounded-lg p-3 space-y-2">
              <Label>Certificate file</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.pfx,.p12"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadPending}
                >
                  <Upload className="h-4 w-4 mr-1" /> Upload
                </Button>
                {fileName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={downloadCertificate}
                    disabled={uploadPending}
                  >
                    <Download className="h-4 w-4 mr-1" /> {fileName}
                  </Button>
                )}
              </div>
              <p className="text-xs text-zinc-500">PDF, PNG, JPG or PFX up to 5 MB.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Custodian name</Label><Input value={form.custodian_name} onChange={(e) => set('custodian_name', e.target.value)} /></div>
            <div className="space-y-2"><Label>Physical location</Label><Input value={form.physical_location} onChange={(e) => set('physical_location', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>PIN (encrypted)</Label><Input type="password" value={form.pin} onChange={(e) => set('pin', e.target.value)} placeholder={initial ? '••••• (leave blank to keep)' : ''} /></div>
            <div className="space-y-2"><Label>Password (encrypted)</Label><Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder={initial ? '••••• (leave blank to keep)' : ''} /></div>
          </div>
          <div className="space-y-2"><Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="revoked">revoked</SelectItem>
                <SelectItem value="suspended">suspended</SelectItem>
                <SelectItem value="expired">expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {initial && <Button variant="outline" onClick={remove} disabled={pending}><Trash2 className="h-4 w-4" /> Delete</Button>}
          <Button onClick={save} disabled={pending} data-testid="dsc-save">{pending ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
