import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md px-6">
        <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto">
          <span className="text-2xl font-bold text-zinc-400">404</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">Page not found</h1>
        <p className="text-zinc-500 text-sm">The page you are looking for does not exist or has been moved.</p>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
