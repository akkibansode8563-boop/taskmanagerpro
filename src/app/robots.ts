import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taskmanagerpro-kappa.vercel.app';
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/terms', '/privacy'],
      disallow: ['/dashboard', '/tasks', '/meetings', '/calendar', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
