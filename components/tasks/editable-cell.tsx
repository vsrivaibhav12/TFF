'use client';
import { useState, useTransition, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { onEnterSpace } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
  color?: string;
}

export function EditableCell({
  value,
  options,
  onSave,
  type = 'badge',
}: {
  value: string;
  options: Option[];
  onSave: (newVal: string) => Promise<boolean>;
  type?: 'badge' | 'text';
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticValue, setOptimisticValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOptimisticValue(value);
  }, [value]);

  const activeOption = options.find((o) => o.value === optimisticValue) || options[0];

  const handleUpdate = (newVal: string) => {
    if (newVal === optimisticValue) return;
    setOptimisticValue(newVal);
    setIsEditing(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const success = await onSave(newVal);
        if (!success) {
          setOptimisticValue(value);
          toast.error('Failed to save change');
        }
      });
    }, 500);
  };

  if (!isEditing) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true); }}
        onKeyDown={onEnterSpace(() => setIsEditing(true))}
        className={`cursor-pointer hover:ring-2 hover:ring-teal-500/20 rounded-md transition-all inline-block ${isPending ? 'opacity-50' : ''}`}
        aria-label="Edit value"
      >
        {type === 'badge' ? (
          <Badge variant={(activeOption?.color as 'default' | 'teal' | 'success' | 'warning' | 'danger' | 'destructive' | 'outline' | 'ghost') || 'outline'}>
            {activeOption?.label || value}
          </Badge>
        ) : (
          <span className="text-sm">{activeOption?.label || value}</span>
        )}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); } }}
      aria-label="Edit value"
    >
      <Select value={optimisticValue} onValueChange={handleUpdate} open={isEditing} onOpenChange={setIsEditing}>
        <SelectTrigger className="h-8 w-full min-w-[120px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {type === 'badge' ? (
                <Badge variant={(o.color as 'default' | 'teal' | 'success' | 'warning' | 'danger' | 'destructive' | 'outline' | 'ghost') || 'outline'} className="mr-2">
                  {o.label}
                </Badge>
              ) : (
                o.label
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
