import { ImageResponse } from 'next/og'

export const alt = 'The Fiscal Fulcrum — Finance Partner for Ambitious Businesses'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background:
            'radial-gradient(ellipse 70% 60% at 30% 30%, rgba(20,184,166,0.45) 0%, rgba(15,23,42,0) 60%), radial-gradient(ellipse 50% 50% at 80% 80%, rgba(13,148,136,0.35) 0%, rgba(15,23,42,0) 60%), #0F172A',
          color: '#FFFFFF',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #14B8A6, #0F766E)' }} />
          <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.01em' }}>The Fiscal Fulcrum</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '72px', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', maxWidth: '900px' }}>
            The Finance Partner for{' '}
            <span style={{ color: '#5EEAD4' }}>Ambitious Businesses</span>
          </div>
          <div style={{ fontSize: '26px', color: '#94A3B8', maxWidth: '900px', lineHeight: 1.4 }}>
            Structured compliance · Virtual CFO · BizLens analytics · CBAM advisory
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '20px', color: '#64748B' }}>
          <div>fiscalfulcrum.in</div>
          <div>Coimbatore · India</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
