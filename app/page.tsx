import MarketingHome from './(marketing)/page';
import MarketingLayout from './(marketing)/layout';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // The marketing homepage is the single entry point for everyone.
  // Users click "Log in" to reach /login, then their dashboard.
  return (
    <MarketingLayout>
      <MarketingHome />
    </MarketingLayout>
  );
}
