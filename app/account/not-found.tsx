import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md px-6">
        <h1 className="text-2xl font-bold text-zinc-900">Page not found</h1>
        <p className="text-zinc-500 text-sm">The account page you are looking for does not exist.</p>
        <Link href="/account" className="text-teal-700 hover:underline font-medium text-sm">
          Back to account
        </Link>
      </div>
    </div>
  );
}
