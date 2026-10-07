/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['779c-102-70-116-102.ngrok-free.app'],

  // NOTE: Re-enable type checking — ignoreBuildErrors was hiding potential safety issues.
  // typescript: { ignoreBuildErrors: true },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  turbopack: {},

  // ── HTTP Security Headers ────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Strict referrer policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Force HTTPS for 1 year (only meaningful in production with TLS)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Disable access to sensitive browser features
          {
            key: 'Permissions-Policy',
            value: 'microphone=(), geolocation=(), interest-cohort=()',
          },
          // Basic Content Security Policy — allows self + Firebase + PayChangu CDNs
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://apis.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://firebasestorage.googleapis.com",
              "connect-src 'self' https://identitytoolkit.googleapis.com https://api.paychangu.com https://firebasestorage.googleapis.com wss:",
              "frame-src 'self' https://zosavuta-45dcf.firebaseapp.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent browser bundle from trying to resolve Node.js built-ins used by mysql2
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        dns: false,
        child_process: false,
        path: false,
        os: false,
        crypto: false,
      };
    }
    return config;
  },
}

export default nextConfig
