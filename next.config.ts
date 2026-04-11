import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'raw.githubusercontent.com' },
      { hostname: 'assets.coingecko.com' },
      { hostname: 'coin-images.coingecko.com' },
    ],
  },
}

export default nextConfig
