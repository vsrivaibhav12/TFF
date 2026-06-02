const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // R-7: Security headers for the financial portal
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com",
              "img-src 'self' data: blob: *.supabase.co",
              "connect-src 'self' *.supabase.co *.supabase.in wss://*.supabase.co",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      // Allow the preview domain (request goes through K8s ingress + FastAPI proxy on 8001 -> 3000)
      allowedOrigins: [
        'localhost:3000',
        '127.0.0.1:3000',
        '127.0.0.1:8001',
        'portal.fiscalfulcrum.in',
        'fiscalfulcrum.in',
      ],
      allowedForwardedHosts: [
        'localhost:3000',
        '127.0.0.1:3000',
        '127.0.0.1:8001',
        'portal.fiscalfulcrum.in',
        'fiscalfulcrum.in',
      ],
    },
  },
};
module.exports = withBundleAnalyzer(nextConfig);
