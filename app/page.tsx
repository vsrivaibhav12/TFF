import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/require-role';
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
  // Role comes from the database profile (user_metadata can be edited by the user).
  const me = await getCurrentUser();
  if (me?.role === 'admin') redirect('/admin');
  if (me?.role === 'team') redirect('/team');

  return (
    <MarketingLayout>
      <MarketingHome />
    </MarketingLayout>
  );
}
