'use client';

import { useMemo } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { formatPeriod, parsePeriodKey, periodOptions, type PeriodType } from '@/lib/periods';
import { todayIST } from '@/lib/utils';

/**
 * One period control for every form. What it offers depends on the service's period type:
 * a month, a fiscal quarter, a half-year or a financial year. Services with no period show a note.
 */
export function PeriodPicker({
  type,
  value,
  onChange,
  disabled,
  ariaLabel = 'Period',
  className,
}: {
  type: PeriodType;
  /** Canonical period key, or empty. */
  value: string | null | undefined;
  onChange: (key: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const options = useMemo(() => {
    const [y, m] = todayIST().split('-').map(Number);
    return periodOptions(type, { year: y, month: m });
  }, [type]);

  if (type === 'none') {
    return <p className="text-xs text-slate-500 py-2">This service has no period.</p>;
  }

  // A stored value of another period type (for example after changing the service) counts as unset.
  const parsed = value ? parsePeriodKey(value) : null;
  const current = parsed && parsed.type === type ? (value as string) : '';
  const listed = options.some((o) => o.key === current);
  const all = !current || listed ? options : [{ key: current, label: formatPeriod(parsed!) }, ...options];

  return (
    <Select value={current} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className ?? 'h-9 text-sm'} aria-label={ariaLabel} data-testid="period-picker">
        <SelectValue placeholder="Choose period" />
      </SelectTrigger>
      <SelectContent>
        {all.map((o) => (
          <SelectItem key={o.key} value={o.key} className="text-sm">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
