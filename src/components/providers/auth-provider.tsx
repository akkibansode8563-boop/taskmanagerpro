'use client';

import { Capacitor } from '@capacitor/core';
import { useEffect, useMemo, type ReactNode } from 'react';
import { requestReminderPermissions, syncTaskReminders } from '@/lib/mobile-reminders';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { ensureProfile, useTasks, useUser } from '@/supabase';
import { useToast } from '@/hooks/use-toast';

const publicRoutes = new Set(['/login', '/terms', '/privacy']);
const notificationStorageKey = 'taskmaster.notifications.prompted';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { data: tasks } = useTasks('updated');
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const isPublicRoute = useMemo(() => publicRoutes.has(pathname), [pathname]);

  useEffect(() => {
    if (!user) return;
    ensureProfile(user).catch(() => {
      // Keep session usable even if profile sync is temporarily unavailable.
    });
  }, [user]);

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

  useEffect(() => {
    if (!user || isPublicRoute) {
      return;
    }

    if (Capacitor.isNativePlatform()) {
      requestReminderPermissions().catch(() => {
        // Keep app usable if native reminder permissions are denied.
      });
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission !== 'default') {
      return;
    }

    if (window.localStorage.getItem(notificationStorageKey) === 'true') {
      return;
    }

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

  useEffect(() => {
    if (!tasks) {
      return;
    }

    if (Capacitor.isNativePlatform()) {
      syncTaskReminders(tasks).catch(() => {
        // Do not block the app if native reminder sync fails.
      });
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    const notifyDueTasks = () => {
      const now = Date.now();

      tasks.forEach((task) => {
        if (!task.reminderTime || task.status === 'COMPLETED') return;

        const reminderTime = new Date(task.reminderTime).getTime();
        const storageKey = `taskmaster.notified.${task.id}.${reminderTime}`;

        if (reminderTime <= now && now - reminderTime < 60_000 && !window.sessionStorage.getItem(storageKey)) {
          new Notification('Task Reminder', {
            body: `It's time for: ${task.name}`,
            icon: '/favicon.ico',
          });
          window.sessionStorage.setItem(storageKey, 'true');
        }
      });
    };

    notifyDueTasks();
    const intervalId = window.setInterval(notifyDueTasks, 60_000);

    return () => window.clearInterval(intervalId);
  }, [tasks]);

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
