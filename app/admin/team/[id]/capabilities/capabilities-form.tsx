'use client';
import { useMemo, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { setUserCapabilityOverridesAction } from '@/lib/actions/staff-capabilities';
import { toast } from 'sonner';
import { Search, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  CAPABILITY_DETAILS,
  CAPABILITY_PERSONAS,
  type Capability,
  type CapabilityPersona,
} from '@/lib/auth/capabilities';

function groupByPersona(all: string[]) {
  const out: Record<CapabilityPersona, string[]> = { daily: [], supervisory: [], admin: [] };
  for (const cap of all) {
    const persona = (CAPABILITY_DETAILS[cap as Capability]?.persona ?? 'supervisory');
    out[persona].push(cap);
  }
  return out;
}

export default function CapabilitiesForm({
  userId,
  userName,
  all,
  granted,
  templateCaps,
}: {
  userId: string;
  userName: string;
  all: string[];
  granted: string[];
  templateCaps: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(granted));
  const [filter, setFilter] = useState('');
  const [pending, startTransition] = useTransition();

  const templateSet = useMemo(() => new Set(templateCaps), [templateCaps]);
  const grouped = useMemo(() => groupByPersona(all), [all]);

  function toggle(cap: string) {
    setSelected((s) => {
      const ns = new Set(s);
      if (ns.has(cap)) ns.delete(cap);
      else ns.add(cap);
      return ns;
    });
  }

  function save() {
    startTransition(async () => {
      const r = await setUserCapabilityOverridesAction({ user_id: userId, capabilities: [...selected] as Capability[] });
      if (r.success) {
        const grantedCount = (r as any).data?.granted ?? 0;
        const revokedCount = (r as any).data?.revoked ?? 0;
        if (grantedCount === 0 && revokedCount === 0) {
          toast.success('No deviations from template — all capabilities align with role');
        } else {
          toast.success(`Saved deviations · +${grantedCount} granted, -${revokedCount} revoked`);
        }
      } else {
        toast.error(r.error);
      }
    });
  }

  const fSet = filter.trim().toLowerCase();

  // Compute deviation summary
  const deviations = [...selected].filter((c) => !templateSet.has(c));
  const revocations = [...templateSet].filter((c) => !selected.has(c));

  return (
    <div className="space-y-6">
      {templateCaps.length > 0 && (
        <div className="tff-card p-4 bg-teal-50/40 border-teal-100 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
          <div className="text-sm text-teal-800">
            <p className="font-medium">Role template active</p>
            <p className="text-teal-700/80 mt-0.5">
              Capabilities marked with <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 text-[10px] font-semibold mx-1">TEMPLATE</span> are inherited from the assigned role.
              Any changes you make here create explicit deviations that override the template.
            </p>
            {deviations.length > 0 && (
              <p className="text-amber-700 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {deviations.length} extra granted, {revocations.length} revoked from template
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter capabilities…" className="pl-9" data-testid="caps-filter" />
        </div>
        <div className="text-sm text-zinc-500 whitespace-nowrap">{selected.size} / {all.length} selected</div>
      </div>

      <div className="space-y-8">
        {CAPABILITY_PERSONAS.map((persona) => {
          const list = grouped[persona.key].filter((c) => {
            if (!fSet) return true;
            const meta = CAPABILITY_DETAILS[c as Capability];
            return c.includes(fSet) || meta.label.toLowerCase().includes(fSet) || meta.description.toLowerCase().includes(fSet);
          });
          if (list.length === 0) return null;
          return (
            <div key={persona.key} className="tff-card overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
                <div className="text-sm font-semibold text-zinc-900">{persona.label}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{persona.description}</div>
              </div>
              <ul className="divide-y divide-zinc-100">
                {list.map((cap) => {
                  const meta = CAPABILITY_DETAILS[cap as Capability];
                  const fromTemplate = templateSet.has(cap);
                  const isSelected = selected.has(cap);
                  return (
                    <li key={cap} className={`flex items-start gap-3 px-4 py-3 ${fromTemplate ? 'bg-zinc-50/50' : ''}`}>
                      <Checkbox
                        id={`cap-${cap}`}
                        checked={isSelected}
                        onCheckedChange={() => toggle(cap)}
                        data-testid={`cap-${cap}`}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={`cap-${cap}`} className="text-sm cursor-pointer font-medium text-zinc-800">
                          {meta.label}
                        </Label>
                        <p className="text-xs text-zinc-500 mt-0.5">{meta.description}</p>
                        <code className="text-[10px] text-zinc-400 font-mono mt-1 block">{cap}</code>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {fromTemplate && isSelected && (
                          <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 text-[10px] font-semibold">TEMPLATE</span>
                        )}
                        {!fromTemplate && isSelected && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-semibold">OVERRIDE</span>
                        )}
                        {fromTemplate && !isSelected && (
                          <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-semibold">REVOKED</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-zinc-200 pt-6">
        <div className="text-sm text-zinc-500">
          {templateCaps.length > 0
            ? 'Only deviations from the role template are stored. Capabilities matching the template are derived automatically.'
            : 'Saving will grant or revoke against the current state. Each change writes one audit entry.'}
        </div>
        <Button onClick={save} disabled={pending} data-testid="caps-save">
          {pending ? 'Saving…' : `Save changes for ${userName}`}
        </Button>
      </div>
    </div>
  );
}
