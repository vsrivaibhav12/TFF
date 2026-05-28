import ScrollReveal from '@/components/site/ScrollReveal'
import InsightsClient from '@/components/site/InsightsClient'

export const metadata = {
  title: 'Insights | Manufacturing Finance, Compliance & CBAM | The Fiscal Fulcrum',
  description: 'Articles on manufacturing finance, structured compliance, CBAM readiness, and financial intelligence for Coimbatore MSMEs.',
  alternates: { canonical: '/insights' },
  openGraph: {
    title: 'Insights | The Fiscal Fulcrum',
    description: 'Articles on manufacturing finance, structured compliance, CBAM readiness, and financial intelligence.',
    url: 'https://www.fiscalfulcrum.in/insights',
    type: 'website',
  },
}

export default function InsightsPage() {
  return (
    <div>
      <section className="hero-radial py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-semibold">Insights</p>
            <h1 className="mt-4 font-display text-[32px] sm:text-[44px] lg:text-[52px] font-bold text-[#0F172A] tracking-[-0.03em] leading-[1.05]">
              Notes from the <span className="text-[#0D9488]">practice</span>
            </h1>
            <p className="mt-5 max-w-2xl text-[#71717A] text-[16px] leading-[1.7]">
              Articles on manufacturing finance, structured compliance, CBAM readiness, and financial intelligence for Coimbatore MSMEs.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <InsightsClient />
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
