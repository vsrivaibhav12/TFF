import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md px-6">
        <h1 className="text-4xl font-bold text-zinc-900">404</h1>
        <p className="text-zinc-500">This page could not be found.</p>
        <Link href="/" className="text-teal-700 hover:underline font-medium">
          Go back home
        </Link>
      </div>
    </div>
  );
}
