'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateSuperAdminPassword } from '@/lib/actions/super-admin';
import { Eye, EyeOff, Copy, Check, Wand2, ShieldCheck } from 'lucide-react';

const SUPER_ADMINS = [
  { email: 'mithuna@svmd.in', name: 'Mithuna' },
  { email: 'vaibhav@svmd.in', name: 'Vaibhav' },
];

export default function SuperAdminsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900">Super admin passwords</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Change the passwords for the two firm owners. They will need the new password to log in.
        </p>
      </div>

      <div className="grid gap-4">
        {SUPER_ADMINS.map((admin) => (
          <AdminPasswordCard key={admin.email} admin={admin} />
        ))}
      </div>
    </div>
  );
}

function AdminPasswordCard({ admin }: { admin: { email: string; name: string } }) {
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ password: string; email: string } | null>(null);
  const [copied, setCopied] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const res = await updateSuperAdminPassword({ email: admin.email as any, password });
    setLoading(false);

    if (!res.success) {
      setError(res.error);
      return;
    }

    setResult(res.data);
    setPassword('');
    setConfirmPassword('');
  }

  function generatePassword() {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%^&*';
    const all = upper + lower + digits + special;

    let next = '';
    next += upper[Math.floor(Math.random() * upper.length)];
    next += lower[Math.floor(Math.random() * lower.length)];
    next += digits[Math.floor(Math.random() * digits.length)];
    next += special[Math.floor(Math.random() * special.length)];
    for (let i = next.length; i < 16; i++) {
      next += all[Math.floor(Math.random() * all.length)];
    }
    next = next.split('').sort(() => Math.random() - 0.5).join('');

    setPassword(next);
    setConfirmPassword(next);
    setShowPassword(true);
    setResult(null);
    setError(null);
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>{admin.name}</CardTitle>
            <CardDescription>{admin.email}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`password-${admin.email}`}>New password</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generatePassword}
                className="h-8 text-teal-700"
              >
                <Wand2 className="h-4 w-4 mr-1.5" />
                Generate strong password
              </Button>
            </div>
            <div className="relative">
              <Input
                id={`password-${admin.email}`}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`confirm-${admin.email}`}>Confirm new password</Label>
            <Input
              id={`confirm-${admin.email}`}
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Type it again"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 space-y-3">
              <div className="text-sm text-teal-900 font-medium">
                Password updated successfully
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={result.password}
                  className="bg-white border-teal-200 text-zinc-900 font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(result.password)}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-teal-800">
                Copy this password now. Ask {admin.name} to use it in an incognito browser window.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={loading || !password || !confirmPassword}>
              {loading ? 'Saving...' : 'Update password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
