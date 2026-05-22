'use client'
import Link from 'next/link'
import { ArrowRight, Shield, BarChart3, BarChart, Lock, Globe } from 'lucide-react'

const all = [
  { key: 'compliance', num: '01', icon: Shield, title: 'Compliance as a Service', short: 'The structured base.', href: '/compliance' },
  { key: 'bizlens',    num: '02', icon: BarChart, title: 'Business Analytics (BizLens)', short: 'Data made visible.', href: '/virtual-cfo' },
  { key: 'vcfo',       num: '03', icon: BarChart3, title: 'Virtual CFO', short: 'Visibility into action.', href: '/virtual-cfo' },
  { key: 'controls',   num: '04', icon: Lock, title: 'Process & Controls', short: 'Documented. Tested. Provable.', href: '/process-controls' },
]

const cbam = { key: 'cbam', icon: Globe, title: 'CBAM & ESG', short: 'Cross-cutting overlay for EU exporters.', href: '/cbam' }

export default function WhereThisFits({ current }) {
  const isActive = (k) => k === current
  const isCbamActive = current === 'cbam'

  return (
    <section className="bg-white py-12 lg:py-16">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="rounded-2xl border border-[#E4E4E7] bg-gradient-to-br from-white to-[#F8FAFB] p-6 lg:p-8">
          <div className="flex items-baseline justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#0D9488] font-bold">Where this fits</p>
              <h3 className="mt-2 font-display text-[22px] sm:text-[26px] font-semibold text-[#0F172A] tracking-[-0.02em]">
                The layered system
              </h3>
            </div>
            <p className="text-[13px] text-[#71717A] max-w-md">
              Each layer builds on the one below it. The current page is highlighted - the others are part of the same system.
            </p>
          </div>

          <div className="mt-7 flex flex-col items-center">
            {[...all].reverse().map((l, i) => {
              const Icon = l.icon
              const active = isActive(l.key)
              const reverseIdx = all.length - 1 - i
              const widthPct = 100 - reverseIdx * 6
              return (
                <Link
                  key={l.key}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={'group relative block transition-all duration-300 ' + (active ? '' : 'hover:-translate-y-0.5')}
                  style={{
                    width: widthPct + '%',
                    marginTop: i === 0 ? 0 : -8,
                    zIndex: 10 + i,
                    opacity: active ? 1 : 0.55,
                    filter: active ? 'none' : 'saturate(0.6)',
                  }}
                >
                  <div className={'flex items-center gap-3 rounded-xl px-4 py-3 border ' + (active ? 'border-[#0D9488] bg-gradient-to-br from-[#F0FDFA] to-white shadow-[0_8px_22px_-12px_rgba(13,148,136,0.4)]' : 'border-[#E4E4E7] bg-white')}>
                    <span className={'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ' + (active ? 'bg-[#0D9488] text-white' : 'bg-[#F4F4F5] text-[#71717A]')}>
                      {l.num}
                    </span>
                    <Icon className={'w-4 h-4 flex-shrink-0 ' + (active ? 'text-[#0D9488]' : 'text-[#71717A]')} />
                    <div className="flex-1 min-w-0">
                      <p className={'text-[14px] sm:text-[15px] font-semibold truncate ' + (active ? 'text-[#0F172A]' : 'text-[#3F3F46]')}>{l.title}</p>
                      <p className="text-[12px] text-[#71717A] truncate">{l.short}</p>
                    </div>
                    {!active && (<ArrowRight className="w-3.5 h-3.5 text-[#71717A] opacity-0 group-hover:opacity-100 transition-opacity" />)}
                  </div>
                </Link>
              )
            })}
          </div>

          <Link
            href={cbam.href}
            className={'group mt-5 flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ' + (isCbamActive ? 'border-[#0D9488] bg-gradient-to-r from-[#F0FDFA] to-white' : 'border-dashed border-[#0D9488]/40 bg-[#F0FDFA]/40 hover:border-[#0D9488] hover:bg-[#F0FDFA]')}
            style={{ opacity: isCbamActive ? 1 : 0.85 }}
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold bg-gradient-to-br from-[#5EEAD4] via-[#0D9488] to-[#0F766E]">
              {'↕'}
            </span>
            <Globe className="w-4 h-4 flex-shrink-0 text-[#0D9488]" />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] sm:text-[15px] font-semibold text-[#0F172A]">{cbam.title}</p>
              <p className="text-[12px] text-[#71717A]">{cbam.short}</p>
            </div>
            {!isCbamActive && <ArrowRight className="w-3.5 h-3.5 text-[#0D9488] opacity-0 group-hover:opacity-100 transition-opacity" />}
          </Link>

          <div className="mt-5 pt-5 border-t border-[#E4E4E7] flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[13px] text-[#71717A]">Want to see how layers combine in your monthly bill?</p>
            <Link href="/pricing" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#0D9488] hover:underline">
              Build your plan <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
