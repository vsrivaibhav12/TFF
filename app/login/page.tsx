import { Suspense } from 'react';
import LoginForm from './login-form';

export const metadata = {
  title: 'Sign in — The Fiscal Fulcrum',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex">
      {/* Left side - brand only */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 flex-col justify-center items-center bg-gradient-to-br from-teal-500 via-teal-600 to-teal-800 text-white p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-6">
            <img src="/logo.svg" className="h-10 w-auto brightness-0 invert" alt="The Fiscal Fulcrum" />
            <div>
              <div className="text-lg font-bold tracking-tight">The Fiscal Fulcrum</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-zinc-50/50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2">
              <img src="/logo.svg" className="h-8 w-auto" alt="The Fiscal Fulcrum" />
              <span className="text-lg font-bold text-zinc-900">The Fiscal Fulcrum</span>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Welcome back</h1>
            <p className="text-sm text-zinc-500 mt-1.5">
              Sign in to access your portal
            </p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>

          <p className="mt-6 text-center text-xs text-zinc-400">
            Authorised users only. All sessions are logged and monitored.
          </p>
        </div>
      </div>
    </main>
  );
}
