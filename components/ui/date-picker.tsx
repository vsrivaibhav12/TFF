'use client';

import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  min?: string;
  max?: string;
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', disabled, className, min, max }: DatePickerProps) {
  const date = value ? parseISO(value) : undefined;
  const minDate = min ? parseISO(min) : undefined;
  const maxDate = max ? parseISO(max) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            !value && 'text-zinc-400',
            className
          )}
        >
          <span>{value ? format(date!, 'dd MMM yyyy') : placeholder}</span>
          <CalendarIcon className="h-4 w-4 text-zinc-400 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) {
              const iso = format(d, 'yyyy-MM-dd');
              onChange(iso);
            }
          }}
          disabled={(d) => {
            if (minDate && d < minDate) return true;
            if (maxDate && d > maxDate) return true;
            return false;
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerProps {
  from?: string;
  to?: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({ from, to, onFromChange, onToChange, disabled, className }: DateRangePickerProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DatePicker value={from} onChange={onFromChange} placeholder="From" disabled={disabled} />
      <span className="text-zinc-400 text-sm">to</span>
      <DatePicker value={to} onChange={onToChange} placeholder="To" disabled={disabled} />
    </div>
  );
}
