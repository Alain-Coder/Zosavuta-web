/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['8a2e-102-70-97-108.ngrok-free.app'],
  typescript: {
    ignoreBuildErrors: true,
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  
}

export default nextConfig
