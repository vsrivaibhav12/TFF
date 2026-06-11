'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { createClient, updateClient, softDeleteClient } from '@/lib/actions/clients';
import { Loader2, ChevronDown } from 'lucide-react';
import { deriveStateFromGstin } from '@/lib/utils';

interface ClientFormProps {
  groups: { id: string; name: string }[];
  owners: { id: string; full_name: string; email: string }[];
  initial?: any;
  onSuccess?: (clientId?: string) => void;
  onDeleteSuccess?: () => void;
}

export default function ClientForm({ groups, owners, initial, onSuccess, onDeleteSuccess }: ClientFormProps) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [loading, setLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [form, setForm] = useState({
    business_name: initial?.business_name ?? '',
    pan: initial?.pan ?? '',
    gstin: initial?.gstin ?? '',
    category: initial?.category ?? '',
    industry: initial?.industry ?? '',
    primary_contact_person: initial?.primary_contact_person ?? '',
    primary_contact_email: initial?.primary_contact_email ?? '',
    primary_contact_phone: initial?.primary_contact_phone ?? '',
    city: initial?.city ?? '',
    state: initial?.state ?? '',
    pincode: initial?.pincode ?? '',
    group_id: initial?.group_id ?? '',
    primary_owner_id: initial?.primary_owner_id ?? '',
    portal_enabled: !!initial?.portal_enabled,
    notes: initial?.notes ?? '',
  });

  function set<K extends keyof typeof form>(k: K, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload: any = { ...form };
    if (!payload.group_id) payload.group_id = null;
    if (!payload.primary_owner_id) payload.primary_owner_id = null;
    if (!payload.category) payload.category = null;
    const result = isEdit
      ? await updateClient({ id: initial.id, ...payload })
      : await createClient(payload);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? 'Client updated' : 'Client created');
    if (onSuccess) {
      onSuccess(isEdit ? initial.id : (result as any).data?.id);
    } else {
      router.push(isEdit ? `/admin/clients/${initial.id}` : `/admin/clients/${(result as any).data.id}`);
    }
  }

  async function onDelete() {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) return;
    setLoading(true);
    const result = await softDeleteClient(initial.id);
    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    toast.success('Client deleted');
    if (onDeleteSuccess) {
      onDeleteSuccess();
    } else {
      router.push('/admin/clients');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" data-testid="client-form">
      {/* Essential fields */}
      <div className="tff-card tff-card-pad space-y-4">
        <h3 className="text-base font-semibold text-zinc-900">Essentials</h3>
        <div className="space-y-2"><Label htmlFor="bn">Business name *</Label><Input id="bn" required value={form.business_name} onChange={(e) => set('business_name', e.target.value)} data-testid="client-business-name" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>PAN</Label><Input value={form.pan} onChange={(e) => set('pan', e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} /></div>
          <div className="space-y-2"><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => { const v = e.target.value.toUpperCase(); set('gstin', v); const d = deriveStateFromGstin(v); if (d) set('state', d); }} placeholder="33ABCDE1234F1Z5" maxLength={15} /></div>
        </div>
        <div className="space-y-2"><Label>Contact person</Label><Input value={form.primary_contact_person} onChange={(e) => set('primary_contact_person', e.target.value)} /></div>
        <div className="space-y-2"><Label>Contact email</Label><Input type="email" value={form.primary_contact_email} onChange={(e) => set('primary_contact_email', e.target.value)} data-testid="client-email" /></div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs text-teal-700"
        onClick={() => setShowMore((p) => !p)}
      >
        {showMore ? 'Fewer options ▲' : 'More options ▼'}
        <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
      </Button>

      {showMore && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-8">
          <div className="tff-card tff-card-pad space-y-4">
            <h3 className="text-base font-semibold text-zinc-900">Business details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => set('category', v)}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {['sole_proprietor', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'huf', 'aop', 'ngo', 'other'].map(c => (
                      <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Industry</Label><Input value={form.industry} onChange={(e) => set('industry', e.target.value)} /></div>
            </div>
          </div>

          <div className="tff-card tff-card-pad space-y-4">
            <h3 className="text-base font-semibold text-zinc-900">Primary contact</h3>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.primary_contact_phone} onChange={(e) => set('primary_contact_phone', e.target.value)} />
            </div>
          </div>

          <div className="tff-card tff-card-pad space-y-4">
            <h3 className="text-base font-semibold text-zinc-900">Address</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></div>
              <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={(e) => set('state', e.target.value)} /></div>
              <div className="space-y-2"><Label>Pincode</Label><Input value={form.pincode} onChange={(e) => set('pincode', e.target.value)} /></div>
            </div>
          </div>

          <div className="tff-card tff-card-pad space-y-4">
            <h3 className="text-base font-semibold text-zinc-900">Engagement</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Group</Label>
                <Select value={form.group_id} onValueChange={(v) => set('group_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Primary owner</Label>
                <Select value={form.primary_owner_id} onValueChange={(v) => set('primary_owner_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.full_name} ({o.email})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input id="pe" type="checkbox" className="h-4 w-4 accent-teal-600" checked={form.portal_enabled} onChange={(e) => set('portal_enabled', e.target.checked)} />
              <Label htmlFor="pe" className="font-normal">Enable client portal access</Label>
            </div>
            <div className="space-y-2"><Label>Internal notes</Label><Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} /></div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} data-testid="client-submit">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : isEdit ? 'Save changes' : 'Create client'}
        </Button>
        {isEdit && (
          <Button type="button" variant="destructive" disabled={loading} onClick={onDelete} data-testid="client-delete">
            Delete client
          </Button>
        )}
      </div>
    </form>
  );
}
