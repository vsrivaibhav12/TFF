'use client';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function BackButton({ href, label = 'Back' }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-4">
      <ChevronLeft className="h-4 w-4" /> {label}
    </Link>
  );
}
