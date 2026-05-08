import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Settlix',
    short_name: 'Settlix',
    description: 'Accept any token. Receive USDC. Non-custodial Solana payments platform.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#432dd7',
    icons: [
      { src: '/logo.png', sizes: '192x192', type: 'image/png' },
      { src: '/settlix-logo.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
