import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MarketingLayout from './(marketing)/layout';
import MarketingHome from './(marketing)/home-content';

export const metadata = {
  title: 'The Fiscal Fulcrum | Finance Partner | Coimbatore',
  description: 'Structured compliance, financial intelligence, and strategic advisory for Coimbatore\u2019s manufacturing MSMEs. CaaS, Virtual CFO, BizLens, CBAM.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'The Fiscal Fulcrum | Finance Partner | Coimbatore',
    description: 'Structured compliance, financial intelligence, and strategic advisory for Coimbatore\u2019s manufacturing MSMEs.',
    url: 'https://www.fiscalfulcrum.in/',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();

  if (user) {
    const role = user.user_metadata?.role ?? 'client';
    if (role === 'admin') redirect('/admin');
    if (role === 'team') redirect('/team');
    redirect('/portal');
  }

  return (
    <MarketingLayout>
      <MarketingHome />
    </MarketingLayout>
  );
}
