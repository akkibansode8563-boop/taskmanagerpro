'use client';

import { Capacitor } from '@capacitor/core';
import { useEffect, useMemo, type ReactNode } from 'react';
import { requestReminderPermissions } from '@/lib/mobile-reminders';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { ensureProfile, useUser, useSupabaseClient } from '@/supabase';
import { useToast } from '@/hooks/use-toast';

const publicRoutes = new Set(['/login', '/terms', '/privacy']);
const notificationStorageKey = 'taskmaster.notifications.prompted';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const isPublicRoute = useMemo(() => publicRoutes.has(pathname), [pathname]);

  // Active session idle timeout (30 minutes)
  useEffect(() => {
    if (!user || isPublicRoute) return;

    const timeoutDuration = 30 * 60 * 1000; // 30 minutes
    let timeoutId: any;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          await supabase.auth.signOut();
          toast({
            title: 'Session Expired',
            description: 'You have been signed out due to inactivity.',
          });
        } catch (e) {
          console.error('Sign out error on idle timeout:', e);
        }
      }, timeoutDuration);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    // Initialize timer
    resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, isPublicRoute, supabase, toast]);

  // Sync the user profile row on every new sign-in.
  useEffect(() => {
    if (!user) return;
    ensureProfile(user).catch(() => {
      // Keep session usable even if profile sync is temporarily unavailable.
    });
  }, [user]);

  // Route protection: redirect unauthenticated users to /login.
  useEffect(() => {
    if (isUserLoading) return;

    if (pathname === '/') {
      router.replace(user ? '/dashboard' : '/login');
      return;
    }

    if (!user && !isPublicRoute) {
      router.replace('/login');
      return;
    }

    if (user && isPublicRoute) {
      router.replace('/dashboard');
    }
  }, [isPublicRoute, isUserLoading, pathname, router, user]);

  // Request native push-notification permission once when the user signs in.
  // Web notification prompting is intentionally kept here to avoid a separate
  // hook, but task-reminder sync is removed from this provider to prevent a
  // redundant useTasks() fetch — reminder sync happens inside TasksPage instead.
  useEffect(() => {
    if (!user || isPublicRoute) return;

    if (Capacitor.isNativePlatform()) {
      requestReminderPermissions().catch(() => {
        // Keep app usable if native reminder permissions are denied.
      });
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    if (window.localStorage.getItem(notificationStorageKey) === 'true') return;

    window.localStorage.setItem(notificationStorageKey, 'true');

    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive reminders for time-based tasks.',
        });
      }
    });
  }, [isPublicRoute, toast, user]);

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-primary/10 p-4 text-primary">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-lg font-semibold">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Preparing your workspace
            </div>
            <p className="text-sm text-muted-foreground">
              Checking your session and loading the latest project data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user && !isPublicRoute) return null;
  if (user && isPublicRoute) return null;

  return <>{children}</>;
}
