import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <h1 className="text-4xl font-bold text-zinc-900">404</h1>
      <p className="text-zinc-500 mt-2">Client not found.</p>
      <Link href="/team/clients" className="inline-flex items-center gap-1 text-teal-700 text-sm font-medium mt-6 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to clients
      </Link>
    </div>
  );
}
