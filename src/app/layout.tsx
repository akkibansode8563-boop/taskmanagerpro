import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import AppHeader from '@/components/layout/app-header';
import AppFooter from '@/components/layout/app-footer';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/providers/auth-provider';
import MobileNav from '@/components/layout/mobile-nav';
import { SupabaseProvider } from '@/supabase';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'TaskMaster Pro',
  description: 'A professional task and meeting management application.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-body antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SupabaseProvider>
            <AuthProvider>
              <div className="flex min-h-screen flex-col">
                <AppHeader />
                <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-4">{children}</main>
                <AppFooter />
                <MobileNav />
              </div>
              <Toaster />
            </AuthProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
