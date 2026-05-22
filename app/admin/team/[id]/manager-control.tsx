'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { updateTeamMemberManagerAction } from '@/lib/actions/team';

interface Props {
  userId: string;
  currentManagerId: string | null;
  team: Array<{ id: string; full_name: string; email: string }>;
}

export default function ManagerControl({ userId, currentManagerId, team }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(currentManagerId ?? '__none__');

  function onChange(val: string) {
    setValue(val);
    startTransition(async () => {
      const r = await updateTeamMemberManagerAction({
        user_id: userId,
        manager_id: val === '__none__' ? null : val,
      });
      if (r.success) {
        toast.success('Manager updated');
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={pending}>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select manager" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">No manager assigned</SelectItem>
        {team
          .filter((m) => m.id !== userId)
          .map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.full_name} ({m.email})
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
