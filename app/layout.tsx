import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { SWRProvider } from '@/lib/swr-config';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});



export const metadata: Metadata = {
  title: { default: 'The Fiscal Fulcrum | Finance Partner | Coimbatore', template: '%s | The Fiscal Fulcrum' },
  description: 'Structured compliance, financial intelligence, and strategic advisory for Coimbatore\u2019s manufacturing MSMEs. CaaS, Virtual CFO, BizLens, CBAM.',
  robots: { index: true, follow: true },
};

export const viewport = { themeColor: '#0D9488', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body className="min-h-screen antialiased">
        <SWRProvider>
          {children}
        </SWRProvider>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            className: 'border-zinc-200 rounded-xl shadow-lg',
          }}
        />
      </body>
    </html>
  );
}
