'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, X } from 'lucide-react'

const services = [
  { label: 'Compliance as a Service', href: '/compliance' },
  { label: 'Virtual CFO', href: '/virtual-cfo' },
  { label: 'CBAM & ESG', href: '/cbam' },
  { label: 'Process & Controls', href: '/process-controls' },
]

export default function Navbar() {
  const [servicesOpen, setServicesOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = (href) => href === '/' ? pathname === '/' : pathname?.startsWith(href)
  const isServicesActive = services.some(s => isActive(s.href))

  const NavLink = ({ href, children }) => {
    const active = isActive(href)
    return (
      <Link href={href} className={'relative transition ' + (active ? 'text-[#0D9488]' : 'text-[#3F3F46] hover:text-[#0D9488]')}>
        {children}
        {active && <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0D9488]" />}
      </Link>
    )
  }

  return (
    <header className={'sticky top-0 z-40 transition-all duration-300 ' + (scrolled ? 'bg-white/90 backdrop-blur-md border-b border-[#E4E4E7] shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)]' : 'bg-white/80 backdrop-blur-md border-b border-[#E4E4E7]/70')}>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#0D9488]/40 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/logo.png" width={28} height={28} className="h-7 w-auto" alt="The Fiscal Fulcrum" />
            <span className="text-[#0D9488] font-display font-bold text-[17px] tracking-tight">The Fiscal Fulcrum</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium">
            <NavLink href="/">Home</NavLink>
            <div className="relative" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}>
              <button className={'relative flex items-center gap-1 transition ' + (isServicesActive ? 'text-[#0D9488]' : 'text-[#3F3F46] hover:text-[#0D9488]')}>
                Services <ChevronDown className="w-4 h-4" />
                {isServicesActive && <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0D9488]" />}
              </button>
              {servicesOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3">
                  <div className="bg-white border border-[#E4E4E7] rounded-xl w-72 p-2 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)]">
                    {services.map(s => (
                      <Link key={s.href} href={s.href} className={'block px-4 py-2.5 rounded-lg text-[14px] transition ' + (isActive(s.href) ? 'bg-[#F0FDFA] text-[#0D9488]' : 'text-[#3F3F46] hover:bg-[#F0FDFA] hover:text-[#0D9488]')}>
                        {s.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <NavLink href="/pricing">Pricing</NavLink>
            <NavLink href="/about">About</NavLink>
            <NavLink href="/insights">Insights</NavLink>
            <NavLink href="/contact">Contact</NavLink>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="inline-flex items-center bg-[#0D9488] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg hover:bg-[#0F766E] transition">
              Log in
            </Link>
            <Link href="/contact#snapshot" className="inline-flex items-center bg-[#0D9488] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg hover:bg-[#0F766E] transition cta-pulse">
              Get Your Free Financial Snapshot
            </Link>
          </div>

          <button className="md:hidden text-[#18181B]" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#E4E4E7] bg-white">
          <div className="px-6 py-4 flex flex-col gap-3 text-[14px] font-medium">
            <Link href="/" onClick={() => setMobileOpen(false)} className="py-2 text-[#3F3F46]">Home</Link>
            <button onClick={() => setMobileServicesOpen(!mobileServicesOpen)} className="flex items-center justify-between py-2 text-[#3F3F46]">
              <span>Services</span> <ChevronDown className={'w-4 h-4 transition ' + (mobileServicesOpen ? 'rotate-180' : '')} />
            </button>
            {mobileServicesOpen && (
              <div className="flex flex-col pl-4 gap-2">
                {services.map(s => (
                  <Link key={s.href} href={s.href} onClick={() => setMobileOpen(false)} className="py-1 text-[#3F3F46]">{s.label}</Link>
                ))}
              </div>
            )}
            <Link href="/pricing" onClick={() => setMobileOpen(false)} className="py-2 text-[#3F3F46]">Pricing</Link>
            <Link href="/about" onClick={() => setMobileOpen(false)} className="py-2 text-[#3F3F46]">About</Link>
            <Link href="/insights" onClick={() => setMobileOpen(false)} className="py-2 text-[#3F3F46]">Insights</Link>
            <Link href="/contact" onClick={() => setMobileOpen(false)} className="py-2 text-[#3F3F46]">Contact</Link>
            <Link href="/login" onClick={() => setMobileOpen(false)} className="inline-flex justify-center bg-[#0D9488] text-white font-semibold px-4 py-2.5 rounded-lg">Log in</Link>
            <Link href="/contact#snapshot" onClick={() => setMobileOpen(false)} className="mt-2 inline-flex justify-center bg-[#0D9488] text-white font-semibold px-4 py-2.5 rounded-lg">
              Get Your Free Financial Snapshot
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
