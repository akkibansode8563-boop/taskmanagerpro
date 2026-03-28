import type { CapacitorConfig } from '@capacitor/cli';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taskmanagerpro-kappa.vercel.app';

const config: CapacitorConfig = {
  appId: 'com.dcc.taskmasterpro',
  appName: 'TaskMaster Pro',
  webDir: '.next',
  server: {
    url: appUrl,
    cleartext: appUrl.startsWith('http://'),
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0b1220',
  },
};

export default config;
