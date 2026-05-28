import { Suspense } from 'react'
import ScrollReveal from '@/components/site/ScrollReveal'
import ContactForm from '@/components/site/ContactForm'
import SnapshotForm from '@/components/site/SnapshotForm'
import { PhoneTrigger, MailTrigger } from '@/components/site/ContactModal'
import { MapPin, Phone, Mail, Linkedin } from 'lucide-react'

export const metadata = {
  title: 'Contact The Fiscal Fulcrum | Start a Conversation | Coimbatore',
  description: 'Get in touch with The Fiscal Fulcrum. Schedule a conversation, request a free Financial Health Snapshot, or reach us directly.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact | The Fiscal Fulcrum',
    description: 'Schedule a conversation or request a free Financial Health Snapshot.',
    url: 'https://www.fiscalfulcrum.in/contact',
    type: 'website',
  },
}

export default function ContactPage() {
  return (
    <div>
      {/* HERO */}
      <section className="hero-radial py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-semibold">Contact</p>
            <h1 className="mt-4 font-display text-[32px] sm:text-[44px] lg:text-[52px] font-bold text-[#0F172A] tracking-[-0.03em] leading-[1.05]">
              Let’s <span className="text-[#0D9488]">Talk</span>
            </h1>
            <p className="mt-5 max-w-2xl text-[#71717A] text-[16px] leading-[1.7]">
              Tell us a bit about your business and we’ll respond within one working day. You can also reach us directly using the details below.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* CONTACT FORM */}
      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="font-display text-[28px] sm:text-[36px] lg:text-[44px] font-semibold text-[#0F172A] tracking-[-0.02em]">
              Start a <span className="text-[#0D9488]">conversation</span>
            </h2>
            <p className="mt-2 text-[#71717A] text-[15px]">A short form. We’ll respond within one working day.</p>
          </ScrollReveal>
          <ScrollReveal delay={120} className="mt-8">
            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-6 lg:p-8">
              <Suspense fallback={<div className="h-32" aria-hidden />}>
                <ContactForm />
              </Suspense>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* SNAPSHOT */}
      <section id="snapshot" className="scroll-smooth-anchor bg-[#F8FAFB] py-12 lg:py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Free Financial Snapshot</p>
            <h2 className="mt-2 font-display text-[28px] sm:text-[36px] lg:text-[44px] italic text-[#0D9488] font-bold leading-[1.15]">
              See what your data says — before you decide anything.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={120}>
            <div className="mt-6 max-w-3xl space-y-3">
              <p className="text-[#71717A] text-[16px] leading-[1.7]">
                Share your last 12 months of FS data. We run it through <span className="text-[#0D9488] font-semibold">BizLens</span> and send you a 2-page Financial Health Snapshot covering revenue and profitability trends, working capital efficiency, key expense patterns, and one risk indicator worth discussing.
              </p>
              <p className="text-[#0F172A] font-medium text-[15px]">Free. No obligation. No sales call unless you want one.</p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={200} className="mt-8">
            <div className="rounded-2xl border-2 border-[#0D9488] bg-white p-6 lg:p-8">
              <SnapshotForm />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* DIRECT CONTACT */}
      <section className="bg-white py-12 lg:py-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="font-display text-[28px] sm:text-[36px] lg:text-[44px] font-semibold text-[#0F172A] tracking-[-0.02em]">Direct contact</h2>
          </ScrollReveal>
          <ScrollReveal delay={120} className="mt-8">
            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-6 lg:p-8">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#A1A1AA] font-bold">Address</p>
                    <p className="mt-2 text-[14px] text-[#0F172A] leading-[1.6]">
                      373/3, Mettupalayam Road,<br />Near FACT, Vadakovai,<br />Coimbatore - 641043
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#A1A1AA] font-bold">Phone</p>
                    <div className="mt-2">
                      <PhoneTrigger phone="+91 88702 08882" className="text-[#0F172A] text-[14px] font-medium">Call us</PhoneTrigger>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#A1A1AA] font-bold">Email</p>
                    <div className="mt-2">
                      <MailTrigger email="info@fiscalfulcrum.in" className="text-[#0F172A] text-[14px] font-medium">Email us</MailTrigger>
                    </div>
                  </div>
                </div>
              </div>

              <div className="my-6 h-px bg-[#E4E4E7]" />

              <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Partners</p>
              <div className="mt-3 grid md:grid-cols-2 gap-3">
                {[
                  { name: 'Sri Vaibhav, CA', email: 'vaibhav@svmd.in', linkedin: 'https://linkedin.com/in/sri-vaibhav', label: 'Email Vaibhav' },
                  { name: 'Mithuna D V, CA', email: 'mithuna@svmd.in', linkedin: 'https://linkedin.com/in/mithuna-d-v-61a842178', label: 'Email Mithuna' },
                ].map(p => (
                  <div key={p.name} className="rounded-lg border border-[#E4E4E7] p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-semibold text-[#0F172A]">{p.name}</p>
                      <div className="mt-1">
                        <MailTrigger email={p.email} className="text-[13px] text-[#71717A]">{p.label}</MailTrigger>
                      </div>
                    </div>
                    <a href={p.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-9 h-9 rounded-lg border border-[#E4E4E7] flex items-center justify-center text-[#71717A] hover:text-[#0D9488] hover:border-[#0D9488] transition">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
