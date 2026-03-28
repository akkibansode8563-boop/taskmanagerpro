import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TaskMaster Pro',
    short_name: 'TaskMaster Pro',
    description: 'Task and meeting execution workspace powered by DCC.',
    start_url: '/login',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0b1220',
    theme_color: '#2563eb',
    categories: ['productivity', 'business', 'utilities'],
    icons: [
      {
        src: '/dcc-logo-back.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/dcc-logo-back.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
