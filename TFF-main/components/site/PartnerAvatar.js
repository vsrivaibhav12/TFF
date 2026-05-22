'use client'
import { useState } from 'react'
import Image from 'next/image'

export default function PartnerAvatar({ src, alt, initials, width = 260, aspect = '4 / 5', objectPosition = 'center 12%' }) {
  const [errored, setErrored] = useState(false)

  if (!src || errored) {
    return (
      <div
        aria-label={alt}
        role="img"
        className="flex-shrink-0 rounded-2xl flex items-center justify-center font-display font-bold text-white tracking-tight"
        style={{
          width,
          aspectRatio: aspect,
          fontSize: Math.round(width * 0.32),
          background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
          boxShadow: '0 18px 40px -12px rgba(13,148,136,0.55)',
        }}
      >
        {initials}
      </div>
    )
  }

  return (
    <div
      className="flex-shrink-0 relative rounded-2xl overflow-hidden bg-[#F4F4F5]"
      style={{
        width,
        aspectRatio: aspect,
        boxShadow: '0 18px 40px -12px rgba(13,148,136,0.30), 0 0 0 1px rgba(13,148,136,0.12)',
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={width + 'px'}
        className="object-cover"
        style={{ objectPosition }}
        onError={() => setErrored(true)}
        priority
      />
    </div>
  )
}
