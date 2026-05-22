'use client';
import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { X } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  selects?: Array<{
    key: string;
    placeholder: string;
    options: SelectOption[];
  }>;
  inputs?: Array<{
    key: string;
    placeholder: string;
    type?: 'text' | 'date';
  }>;
}

export default function FilterBar({ selects = [], inputs = [] }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    params.forEach((val, key) => { v[key] = val; });
    return v;
  });

  function update(key: string, val: string) {
    const next = { ...values, [key]: val === '__none__' ? '' : val };
    setValues(next);
    apply(next);
  }

  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams();
    for (const [k, val] of Object.entries(next)) {
      if (val !== '' && val !== '__none__') sp.set(k, val);
    }
    router.push(`${pathname}?${sp.toString()}`);
  }

  function clear() {
    setValues({});
    router.push(pathname);
  }

  const hasFilters = Object.values(values).some((v) => v !== '' && v !== '__none__');

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {selects.map((s) => (
        <Select key={s.key} value={values[s.key] || '__none__'} onValueChange={(v) => update(s.key, v)}>
          <SelectTrigger className="w-44 h-9 text-xs">
            <SelectValue placeholder={s.placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{s.placeholder}</SelectItem>
            {s.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {inputs.map((i) => (
        <Input
          key={i.key}
          type={i.type || 'text'}
          placeholder={i.placeholder}
          value={values[i.key] || ''}
          onChange={(e) => update(i.key, e.target.value)}
          className="w-40 h-9 text-xs"
        />
      ))}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clear} className="h-9 text-xs gap-1">
          <X className="h-3 w-3" /> Clear
        </Button>
      )}
    </div>
  );
}
