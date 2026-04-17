import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow mobile devices on the local network to load dev-only assets and HMR endpoints.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*', '*.ngrok-free.dev', '*.solanapay.com', '*.itssvk.dev'],
  images: {
    remotePatterns: [
      { hostname: 'raw.githubusercontent.com' },
      { hostname: 'assets.coingecko.com' },
      { hostname: 'coin-images.coingecko.com' },
    ],
  },
}

export default nextConfig
