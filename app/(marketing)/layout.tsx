import Navbar from '@/components/site/Navbar';
import Footer from '@/components/site/Footer';
import WhatsAppButton from '@/components/site/WhatsAppButton';
import ProgressBar from '@/components/site/ProgressBar';
import BackToTop from '@/components/site/BackToTop';
import PageTransition from '@/components/site/PageTransition';

const SITE = 'https://www.fiscalfulcrum.in';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
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
  };

  return (
    <div className="font-sans bg-white text-[#71717A]">
      <ProgressBar />
      <Navbar />
      <main className="min-h-screen">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
      <WhatsAppButton />
      <BackToTop />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
    </div>
  );
}
