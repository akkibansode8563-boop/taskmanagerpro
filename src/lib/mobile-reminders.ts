'use client';

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Task } from '@/lib/types';
import { normalizeTask } from '@/lib/workflow';

const maxNotificationId = 2_147_483_647;

function getNotificationId(taskId: string) {
  let hash = 0;
  for (let index = 0; index < taskId.length; index += 1) {
    hash = (hash * 31 + taskId.charCodeAt(index)) | 0;
  }

  return Math.abs(hash) % maxNotificationId;
}

export async function requestReminderPermissions() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  await LocalNotifications.requestPermissions();
}

export async function scheduleTaskReminder(task: Task) {
  const normalizedTask = normalizeTask(task);
  const notificationId = getNotificationId(normalizedTask.id);

  await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });

  if (!normalizedTask.reminderTime || normalizedTask.status === 'COMPLETED') {
    return;
  }

  const reminderAt = new Date(normalizedTask.reminderTime);
  if (Number.isNaN(reminderAt.getTime()) || reminderAt.getTime() <= Date.now()) {
    return;
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationId,
        title: 'Task Reminder',
        body: normalizedTask.details
          ? `${normalizedTask.name} • ${normalizedTask.details}`
          : `It's time for ${normalizedTask.name}`,
        schedule: { at: reminderAt, allowWhileIdle: true },
        sound: undefined,
        smallIcon: 'ic_launcher',
      },
    ],
  });
}

export async function cancelTaskReminder(taskId: string) {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  await LocalNotifications.cancel({ notifications: [{ id: getNotificationId(taskId) }] });
}

export async function syncTaskReminders(tasks: Task[]) {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  const activeIds = new Set<number>();

  for (const task of tasks) {
    const normalizedTask = normalizeTask(task);
    const notificationId = getNotificationId(normalizedTask.id);
    activeIds.add(notificationId);
    await scheduleTaskReminder(normalizedTask);
  }

  const pending = await LocalNotifications.getPending();
  const staleNotifications = pending.notifications
    .filter((notification) => !activeIds.has(notification.id))
    .map((notification) => ({ id: notification.id }));

  if (staleNotifications.length > 0) {
    await LocalNotifications.cancel({ notifications: staleNotifications });
  }
}
