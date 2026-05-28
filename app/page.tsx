import MarketingLayout from './(marketing)/layout'
import MarketingHome from './(marketing)/home-content'

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
}

export default function HomePage() {
  return (
    <MarketingLayout>
      <MarketingHome />
    </MarketingLayout>
  )
}
