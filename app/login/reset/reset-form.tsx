'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { MIN_PASSWORD_LENGTH, validatePassword } from '@/lib/auth/password-policy';

type Phase = 'checking' | 'ready' | 'invalid';

export default function ResetForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  // The emailed link arrives as /login/reset?code=... Exchange it for a session so
  // the user is allowed to set a new password.
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    (async () => {
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        if (error) return setPhase('invalid');
        window.history.replaceState({}, '', '/login/reset');
        return setPhase('ready');
      }
      const { data } = await supabase.auth.getSession();
      if (active) setPhase(data.session ? 'ready' : 'invalid');
    })();
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validatePassword(password);
    if (problem) return toast.error(problem);
    if (password !== confirm) return toast.error('The two passwords do not match');

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }
    await supabase.auth.signOut();
    toast.success('Password updated. Sign in with your new password.');
    router.replace('/login');
  }

  if (phase === 'checking') {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-10 flex justify-center text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (phase === 'invalid') {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-8 text-center space-y-4">
          <p className="text-sm text-slate-600">This reset link is invalid or has expired. Request a new one.</p>
          <Link href="/login/forgot" className="text-sm text-teal-700 hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Request a new link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? (<><Loader2 className="h-4 w-4 animate-spin" /> Saving</>) : 'Update password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
