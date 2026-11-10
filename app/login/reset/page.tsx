import { Metadata } from 'next';
import Image from 'next/image';
import ResetForm from './reset-form';

export const metadata: Metadata = {
  title: 'Choose a new password — The Fiscal Fulcrum',
};

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-zinc-50/50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <Image src="/logo.png" width={160} height={32} className="h-8 w-auto object-contain" alt="The Fiscal Fulcrum" priority />
            <span className="text-lg font-bold text-zinc-900">The Fiscal Fulcrum</span>
          </div>
        </div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Choose a new password</h1>
          <p className="text-sm text-zinc-500 mt-1.5">Use at least 10 characters.</p>
        </div>
        <ResetForm />
      </div>
    </main>
  );
}
