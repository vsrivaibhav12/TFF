import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/site/Navbar'
import Footer from '@/components/site/Footer'
import WhatsAppButton from '@/components/site/WhatsAppButton'
import ProgressBar from '@/components/site/ProgressBar'
import BackToTop from '@/components/site/BackToTop'
import PageTransition from '@/components/site/PageTransition'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', weight: ['400', '500', '600', '700'] })
const display = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display', weight: ['400', '500', '600', '700', '800'] })

const SITE = 'https://www.fiscalfulcrum.in'

export const metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'The Fiscal Fulcrum | Finance Partner | Coimbatore', template: '%s | The Fiscal Fulcrum' },
  description: 'Structured compliance, financial intelligence, and strategic advisory for Coimbatore\u2019s manufacturing MSMEs. CaaS, Virtual CFO, BizLens, CBAM.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'The Fiscal Fulcrum',
    title: 'The Fiscal Fulcrum | Finance Partner | Coimbatore',
    description: 'Structured compliance, financial intelligence, and strategic advisory for Coimbatore\u2019s manufacturing MSMEs.',
    url: SITE,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Fiscal Fulcrum | Finance Partner | Coimbatore',
    description: 'Structured compliance, financial intelligence, and strategic advisory for Coimbatore\u2019s manufacturing MSMEs.',
  },
  robots: { index: true, follow: true },
}

export const viewport = { themeColor: '#0D9488', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }) {
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'The Fiscal Fulcrum LLP',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '373/3, Mettupalayam Road, Near FACT, Vadakovai',
      addressLocality: 'Coimbatore',
      addressRegion: 'Tamil Nadu',
      postalCode: '641043',
      addressCountry: 'IN',
    },
    telephone: '+91 88702 08882',
    email: 'office@svmd.in',
    url: SITE,
    serviceType: ['Compliance as a Service', 'Virtual CFO', 'CBAM Advisory', 'Process & Controls', 'BizLens Analytics'],
  }
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="font-sans bg-white text-[#71717A] antialiased">
        <ProgressBar />
        <Navbar />
        <main className="min-h-screen">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
        <WhatsAppButton />
        <BackToTop />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      </body>
    </html>
  )
}
