'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { createClient } from '@/lib/actions/clients';
import { ChevronDown } from 'lucide-react';
import { deriveStateFromGstin } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Helper: coerces null/undefined/empty-string to '' so Zod unions don't fail with "Invalid input"
function optionalStr<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (val) => (val === undefined || val === null || val === '') ? '' : String(val),
    z.union([z.literal(''), schema])
  ).optional();
}

// Re-declare schema for client-side validation
const formSchema = z.object({
  business_name: z.string().min(1, "Business name is required"),
  pan: z.string().optional(),
  gstin: z.string().optional(),
  category: z.string().optional(),
  industry: z.string().optional(),
  primary_contact_person: z.string().optional(),
  primary_contact_phone: z.string().optional(),
  primary_contact_email: optionalStr(z.string().email("Invalid email")),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  group_id: optionalStr(z.string()),
  portal_enabled: z.boolean().default(false),
  portal_email: optionalStr(z.string().email("Invalid portal email")),
  portal_password: optionalStr(z.string().min(6, "Password must be at least 6 characters")),
  notes: z.string().optional(),
});

export function ClientCreateForm({ groups, onSuccess, onCancel }: { groups: { id: string; name: string }[]; onSuccess?: (clientId?: string) => void; onCancel?: () => void }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      business_name: '',
      group_id: '',
      portal_enabled: false,
      notes: '',
    },
  });

  // Auto-derive state from GSTIN (first 2 characters)
  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    form.setValue('gstin', val);
    const derived = deriveStateFromGstin(val);
    if (derived) form.setValue('state', derived);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const payload: any = { ...values };
    if (!payload.group_id || payload.group_id === '__unassigned__') payload.group_id = null;
    if (!payload.portal_email) payload.portal_email = null;
    if (!payload.portal_password) payload.portal_password = null;
    const result = await createClient(payload);
    setIsSubmitting(false);

    if (result.success) {
      toast.success('Client created successfully');
      if (onSuccess) {
        onSuccess(result.data?.id);
      } else {
        router.push(`/admin/clients/${result.data?.id}`);
      }
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-3xl pb-24">
      {/* Essential fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="business_name">Business name *</Label>
          <Input id="business_name" {...form.register('business_name')} placeholder="e.g., Acme Corp Pvt Ltd" />
          {form.formState.errors.business_name && <span className="text-sm text-red-600">{form.formState.errors.business_name.message}</span>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pan">PAN</Label>
            <Input id="pan" {...form.register('pan')} onChange={(e) => form.setValue('pan', e.target.value.toUpperCase())} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gstin">GSTIN</Label>
            <Input id="gstin" {...form.register('gstin')} onChange={handleGstinChange} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Primary contact person</Label>
          <Input {...form.register('primary_contact_person')} />
        </div>
        <div className="space-y-2">
          <Label>Primary contact email</Label>
          <Input type="email" {...form.register('primary_contact_email')} />
          {form.formState.errors.primary_contact_email && <span className="text-sm text-red-600">{form.formState.errors.primary_contact_email.message}</span>}
        </div>
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
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2">Primary contact</h3>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...form.register('primary_contact_phone')} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2">Address</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input {...form.register('city')} />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input {...form.register('state')} />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input {...form.register('pincode')} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2">Engagement</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Group</Label>
                  <Select value={form.watch('group_id') || ''} onValueChange={(val) => form.setValue('group_id', val)}>
                    <SelectTrigger><SelectValue placeholder="No group" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unassigned__">No group</SelectItem>
                      {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Switch 
                  id="portal_enabled" 
                  checked={form.watch('portal_enabled')}
                  onCheckedChange={(val) => {
                    form.setValue('portal_enabled', val);
                    if (!val) {
                      form.setValue('portal_email', '');
                      form.setValue('portal_password', '');
                    }
                  }}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="portal_enabled">Enable client portal access</Label>
                  <p className="text-sm text-zinc-500">When enabled, set login credentials so they can sign in immediately.</p>
                </div>
              </div>
              {form.watch('portal_enabled') && (
                <div className="grid grid-cols-2 gap-4 tff-card tff-card-pad bg-zinc-50">
                  <div className="space-y-2">
                    <Label htmlFor="portal_email">Portal login email *</Label>
                    <Input id="portal_email" type="email" {...form.register('portal_email')} placeholder="client@company.in" />
                    {form.formState.errors.portal_email && <span className="text-sm text-red-600">{form.formState.errors.portal_email.message}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portal_password">Portal password *</Label>
                    <Input id="portal_password" type="password" {...form.register('portal_password')} placeholder="Min 6 characters" />
                    {form.formState.errors.portal_password && <span className="text-sm text-red-600">{form.formState.errors.portal_password.message}</span>}
                  </div>
                </div>
              )}
              <div className="space-y-2"><Label>Internal notes</Label><Textarea value={form.watch('notes') ?? ''} onChange={(e) => form.setValue('notes', e.target.value)} rows={3} /></div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-4">
        <Button variant="outline" type="button" onClick={() => onCancel ? onCancel() : router.back()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700">
          {isSubmitting ? 'Saving...' : 'Save client'}
        </Button>
      </div>
    </form>
  );
}
