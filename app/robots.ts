import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zosavuta.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/organizer/dashboard/','/organizer/','/operator/', '/dashboard/', '/my-bookings/', '/auth/', '/email-verification/','/checkout/','/tickets/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
