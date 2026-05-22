'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { updateTeamMemberCredentialsAction } from '@/lib/actions/auth';
import { Lock, Mail } from 'lucide-react';

export default function CredentialsControl({ userId, currentEmail }: { userId: string; currentEmail: string }) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState(currentEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function save() {
    const payload: { user_id: string; email?: string; password?: string } = { user_id: userId };
    if (email.trim() && email.trim() !== currentEmail) payload.email = email.trim();
    if (password.trim() && password.length >= 6) payload.password = password.trim();
    if (!payload.email && !payload.password) {
      toast.error('Enter a new email or password to update');
      return;
    }
    startTransition(async () => {
      const r = await updateTeamMemberCredentialsAction(payload);
      if (r.success) {
        toast.success('Credentials updated');
        setPassword('');
        setShowPassword(false);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-zinc-400" /> Login email
        </Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@company.com"
        />
        <p className="text-xs text-zinc-500">Changing this updates both the auth email and the profile.</p>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-zinc-400" /> New password
        </Label>
        <div className="flex gap-2">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current"
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => setShowPassword((v) => !v)}>
            {showPassword ? 'Hide' : 'Show'}
          </Button>
        </div>
        {password.length > 0 && password.length < 6 && (
          <p className="text-xs text-red-600">Password must be at least 6 characters.</p>
        )}
      </div>

      <Button onClick={save} disabled={pending} size="sm" className="bg-teal-600 hover:bg-teal-700">
        {pending ? 'Saving…' : 'Update credentials'}
      </Button>
    </div>
  );
}
