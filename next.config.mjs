/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['736b-102-70-117-155.ngrok-free.app'],
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
