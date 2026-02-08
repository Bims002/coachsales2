const nextConfig = {
  reactStrictMode: true,
  // Fix for Turbopack error when using webpack config
  turbopack: {},
  experimental: {
    optimizeCss: true,
  },
  webpack: (config: any) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },

  // Configuration des headers de sécurité
  async headers() {
    return [
      {
        // Appliquer à toutes les routes
        source: '/:path*',
        headers: [
          // HTTPS forcé en production
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Protection XSS
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Empêcher le MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Protection clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Politique de référent
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js nécessite unsafe-eval et unsafe-inline
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https://*.supabase.co https://*.google.com wss://*.supabase.co",
              "media-src 'self' blob:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
        ],
      },
      {
        // Configuration CORS pour les API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production'
              ? process.env.NEXT_PUBLIC_APP_URL || 'https://coachsales.com'
              : '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,DELETE,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
        ],
      },
    ];
  },
} satisfies import('next').NextConfig as any;

export default nextConfig;
