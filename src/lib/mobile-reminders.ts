'use client';

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Task } from '@/lib/types';
import { normalizeTask } from '@/lib/workflow';

const maxNotificationId = 2_147_483_647;
export const REMINDER_CHANNEL_ID = 'task-reminders';

export function getNotificationId(taskId: string): number {
  let hash = 0;
  for (let index = 0; index < taskId.length; index += 1) {
    hash = (hash * 31 + taskId.charCodeAt(index)) | 0;
  }

  return Math.abs(hash) % maxNotificationId;
}

let isChannelCreated = false;

/**
 * Initializes the native notification channel (Android 8.0+)
 * with HIGH importance for pop-on-screen alerts.
 */
export async function ensureNotificationChannel() {
  if (!Capacitor.isNativePlatform()) return;
  if (isChannelCreated) return;

  try {
    await LocalNotifications.createChannel({
      id: REMINDER_CHANNEL_ID,
      name: 'Task Reminders',
      description: 'High-priority task alerts and scheduled due reminders',
      importance: 5, // Importance.High (heads-up notification)
      visibility: 1, // Visibility.Public
      vibration: true,
      lights: true,
      lightColor: '#2563eb',
    });
    isChannelCreated = true;
  } catch (err) {
    console.warn('[mobile-reminders] createChannel error:', err);
  }
}

/**
 * Initializes listeners for tapping local notifications and deep-links to /tasks?highlight=<id>
 */
let isListenerAttached = false;
export async function initializeMobileReminders(onNavigate?: (url: string) => void) {
  if (!Capacitor.isNativePlatform()) return;

  await ensureNotificationChannel();

  if (!isListenerAttached) {
    try {
      await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const extra = action.notification.extra as { taskId?: string; url?: string } | undefined;
        const targetUrl = extra?.url || (extra?.taskId ? `/tasks?highlight=${extra.taskId}` : '/tasks');

        if (onNavigate) {
          onNavigate(targetUrl);
        } else if (typeof window !== 'undefined') {
          window.location.href = targetUrl;
        }
      });
      isListenerAttached = true;
    } catch (err) {
      console.warn('[mobile-reminders] addListener error:', err);
    }
  }
}

export async function requestReminderPermissions() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await LocalNotifications.requestPermissions();
    await ensureNotificationChannel();
  } catch (err) {
    console.warn('[mobile-reminders] requestReminderPermissions error:', err);
  }
}

export async function scheduleTaskReminder(task: Task) {
  if (!Capacitor.isNativePlatform()) return;

  const normalizedTask = normalizeTask(task);
  const notificationId = getNotificationId(normalizedTask.id);

  // Cancel any existing reminder for this task
  await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });

  if (!normalizedTask.reminderTime || normalizedTask.status === 'COMPLETED') {
    return;
  }

  const reminderAt = new Date(normalizedTask.reminderTime);
  if (Number.isNaN(reminderAt.getTime()) || reminderAt.getTime() <= Date.now()) {
    return;
  }

  await ensureNotificationChannel();

  try {
    // Attempt exact alarm scheduling with allowWhileIdle (exact timing even in Doze mode)
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title: 'Task Reminder',
          body: normalizedTask.details
            ? `${normalizedTask.name} • ${normalizedTask.details}`
            : `It's time for ${normalizedTask.name}`,
          schedule: { at: reminderAt, allowWhileIdle: true },
          channelId: REMINDER_CHANNEL_ID,
          smallIcon: 'ic_launcher',
          extra: {
            taskId: normalizedTask.id,
            reminderTime: normalizedTask.reminderTime,
            url: `/tasks?highlight=${normalizedTask.id}`,
          },
        },
      ],
    });
  } catch (exactErr) {
    console.warn('[mobile-reminders] exact schedule failed, trying standard fallback:', exactErr);
    try {
      // Fallback if SCHEDULE_EXACT_ALARM is denied
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: 'Task Reminder',
            body: normalizedTask.details
              ? `${normalizedTask.name} • ${normalizedTask.details}`
              : `It's time for ${normalizedTask.name}`,
            schedule: { at: reminderAt },
            channelId: REMINDER_CHANNEL_ID,
            smallIcon: 'ic_launcher',
            extra: {
              taskId: normalizedTask.id,
              reminderTime: normalizedTask.reminderTime,
              url: `/tasks?highlight=${normalizedTask.id}`,
            },
          },
        ],
      });
    } catch (fallbackErr) {
      console.error('[mobile-reminders] schedule fallback error:', fallbackErr);
    }
  }
}

export async function cancelTaskReminder(taskId: string) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: getNotificationId(taskId) }] });
  } catch (err) {
    console.warn('[mobile-reminders] cancelTaskReminder error:', err);
  }
}

/**
 * Deduplication helper: cancels the pending local notification for a task
 * when a remote FCM push notification arrives for the same task.
 */
export async function cancelMatchingLocalReminder(taskId: string) {
  return cancelTaskReminder(taskId);
}

export async function syncTaskReminders(tasks: Task[]) {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  await ensureNotificationChannel();

  const activeIds = new Set<number>();

  for (const task of tasks) {
    const normalizedTask = normalizeTask(task);
    const notificationId = getNotificationId(normalizedTask.id);
    activeIds.add(notificationId);
    await scheduleTaskReminder(normalizedTask);
  }

  try {
    const pending = await LocalNotifications.getPending();
    const staleNotifications = pending.notifications
      .filter((notification) => !activeIds.has(notification.id))
      .map((notification) => ({ id: notification.id }));

    if (staleNotifications.length > 0) {
      await LocalNotifications.cancel({ notifications: staleNotifications });
    }
  } catch (err) {
    console.warn('[mobile-reminders] syncTaskReminders getPending error:', err);
  }
}
