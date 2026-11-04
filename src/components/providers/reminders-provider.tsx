'use client';

import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import type { Task } from '@/lib/types';
import { useRealtime, subscribeToRemoteTaskAlert, useSupabase } from '@/supabase';
import { initializeMobileReminders, syncTaskReminders } from '@/lib/mobile-reminders';
import { registerPushForUser } from '@/lib/push-registration';
import { getReminderDedupeKey } from '@/lib/sync-logic';
import { notify, playNotificationTone } from '@/lib/notifications';
import { InAppReminderDialog } from '@/components/reminders/in-app-reminder-dialog';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

type RemindersContextValue = {
  activeReminderTask: Task | null;
  triggerReminderModal: (task: Task) => void;
};

const RemindersContext = createContext<RemindersContextValue | undefined>(undefined);

export function RemindersProvider({ children }: { children: ReactNode }) {
  const { tasks } = useRealtime();
  const { supabase, user } = useSupabase();
  const { toast } = useToast();
  const router = useRouter();

  const [activeReminderTask, setActiveReminderTask] = useState<Task | null>(null);
  const firedReminderKeysRef = useRef<Set<string>>(new Set<string>());

  // Initialize native reminder channel & deep link listener
  useEffect(() => {
    initializeMobileReminders((url) => router.push(url)).catch(() => {});
  }, [router]);

  // Register push notifications (FCM on native, VAPID on web)
  useEffect(() => {
    if (!user) return;
    registerPushForUser(supabase, user, (url) => router.push(url)).catch((err) => {
      console.warn('[RemindersProvider] registerPush error:', err);
    });
  }, [router, supabase, user]);

  // Sync native reminders whenever tasks list changes or on app resume
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!tasks || tasks.length === 0) return;

    syncTaskReminders(tasks).catch((err) => {
      console.warn('[RemindersProvider] Native sync failed:', err);
    });
  }, [tasks]);

  // Handle App resume / state change on mobile
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;
    import('@capacitor/app').then(({ App }) => {
      const listener = App.addListener('appStateChange', (state) => {
        if (state.isActive && tasks && tasks.length > 0) {
          syncTaskReminders(tasks).catch(() => {});
        }
      });
      cleanup = () => {
        listener.then((handle) => handle.remove()).catch(() => {});
      };
    }).catch(() => {});

    return () => {
      cleanup?.();
    };
  }, [tasks]);

  // Periodic reminder checker for in-app / web notifications
  useEffect(() => {
    const checkReminders = () => {
      if (!tasks || tasks.length === 0) return;

      const now = Date.now();
      for (const task of tasks) {
        if (task.status === 'COMPLETED') continue;
        if (!task.reminderTime) continue;

        const reminderMs = new Date(task.reminderTime).getTime();
        if (Number.isNaN(reminderMs)) continue;

        // If reminder is within past 15 minutes and not already fired
        if (reminderMs <= now && reminderMs >= now - 15 * 60 * 1000) {
          const dedupeKey = getReminderDedupeKey(task.id, task.reminderTime);
          if (!firedReminderKeysRef.current.has(dedupeKey)) {
            firedReminderKeysRef.current.add(dedupeKey);

            // Trigger OS / Web notification
            notify({
              title: 'Task Reminder',
              body: task.details ? `${task.name}: ${task.details}` : task.name,
              taskId: task.id,
              urgency: task.priority,
            });

            // Trigger in-app dialog
            setActiveReminderTask(task);
          }
        }
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [tasks]);

  // Listen to remote realtime task mutations for in-app toast/dialog
  useEffect(() => {
    const unsubscribe = subscribeToRemoteTaskAlert((event) => {
      if (event.action === 'inserted') {
        if (event.item.priority === 'HIGH') {
          playNotificationTone('HIGH');
        }

        toast({
          title: 'New task received from another device',
          description: event.item.name,
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/tasks?highlight=${event.item.id}`)}
            >
              Open
            </Button>
          ),
        });
      } else if (event.action === 'updated') {
        // If an updated task has a new reminder that just became due, notify
        const now = Date.now();
        if (
          event.item.status !== 'COMPLETED' &&
          event.item.reminderTime &&
          new Date(event.item.reminderTime).getTime() <= now
        ) {
          const dedupeKey = getReminderDedupeKey(event.item.id, event.item.reminderTime);
          if (!firedReminderKeysRef.current.has(dedupeKey)) {
            firedReminderKeysRef.current.add(dedupeKey);
            notify({
              title: 'Task Reminder',
              body: event.item.name,
              taskId: event.item.id,
              urgency: event.item.priority,
            });
            setActiveReminderTask(event.item);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [router, toast]);

  const value = {
    activeReminderTask,
    triggerReminderModal: (task: Task) => setActiveReminderTask(task),
  };

  return (
    <RemindersContext.Provider value={value}>
      {children}
      <InAppReminderDialog
        task={activeReminderTask}
        isOpen={Boolean(activeReminderTask)}
        onClose={() => setActiveReminderTask(null)}
      />
    </RemindersContext.Provider>
  );
}

export function useReminders() {
  const context = useContext(RemindersContext);
  if (!context) {
    throw new Error('useReminders must be used within a RemindersProvider');
  }
  return context;
}
