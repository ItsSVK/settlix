import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/docs', '/pay/', '/subscribe/', '/invoice/'],
        disallow: ['/dashboard/', '/api/', '/embed/', '/manage/'],
      },
    ],
    sitemap: 'https://settlix.itssvk.dev/sitemap.xml',
    host: 'https://settlix.itssvk.dev',
  }
}
