import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export type NotificationUrgency = 'HIGH' | 'MEDIUM' | 'LOW';

export type NotifyOptions = {
  title: string;
  body: string;
  taskId?: string;
  urgency?: NotificationUrgency;
  tag?: string;
};

const SOUND_STORAGE_KEY = 'taskmaster:sound_enabled';

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(SOUND_STORAGE_KEY);
  return stored !== 'false'; // default true
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
}

/**
 * Synthesizes a crisp chime using the Web Audio API for HIGH priority tasks.
 * Zero external asset dependencies, zero network requests, works completely offline.
 */
export function playNotificationTone(urgency?: NotificationUrgency) {
  if (typeof window === 'undefined') return;
  if (urgency !== 'HIGH') return;
  if (!isSoundEnabled()) return;

  // Haptic vibration on supported devices
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch {
      // Ignore vibration error
    }
  }

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Two-tone bell chime
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.15); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880.0, now);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.warn('[playNotificationTone] audio failed:', err);
  }
}

export type PermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function getNotificationPermissionStatus(): PermissionStatus {
  if (typeof window === 'undefined') return 'unsupported';

  if (Capacitor.isNativePlatform()) {
    return 'default'; // Native handles permissions through Capacitor plugins
  }

  if (!('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission as PermissionStatus;
}

export async function requestNotificationPermission(): Promise<PermissionStatus> {
  if (typeof window === 'undefined') return 'unsupported';

  if (Capacitor.isNativePlatform()) {
    try {
      const res = await LocalNotifications.requestPermissions();
      return res.display === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  if (!('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const perm = await Notification.requestPermission();
    return perm as PermissionStatus;
  } catch (err) {
    console.error('[requestNotificationPermission] error:', err);
    return 'denied';
  }
}

function getNumericNotificationId(idStr: string): number {
  let hash = 0;
  for (let i = 0; i < idStr.length; i += 1) {
    hash = (hash * 31 + idStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2_147_483_647;
}

/**
 * Universal cross-platform notify function.
 * Routes to Capacitor LocalNotifications on native mobile and
 * to Service Worker showNotification on web/desktop.
 */
export async function notify(options: NotifyOptions): Promise<void> {
  if (typeof window === 'undefined') return;

  const { title, body, taskId, urgency, tag } = options;
  const notifTag = tag || (taskId ? `task-${taskId}` : `notification-${Date.now()}`);

  playNotificationTone(urgency);

  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: taskId ? getNumericNotificationId(taskId) : Math.floor(Math.random() * 1000000),
            title,
            body,
            channelId: 'task-reminders',
            schedule: { at: new Date() },
            extra: { taskId, url: taskId ? `/tasks?highlight=${taskId}` : '/tasks' },
            smallIcon: 'ic_launcher',
          },
        ],
      });
    } catch (err) {
      console.warn('[notify] native local notification error:', err);
    }
    return;
  }

  // Web Notification path via Service Worker (works in background tab)
  if ('Notification' in window && Notification.permission === 'granted') {
    const notifOptions: NotificationOptions = {
      body,
      tag: notifTag,
      icon: '/dcc-logo-back.png',
      badge: '/favicon.ico',
      data: {
        url: taskId ? `/tasks?highlight=${taskId}` : '/tasks',
        taskId,
      },
    };

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, notifOptions);
          return;
        }
      } catch {
        // Fallback to window.Notification
      }
    }

    try {
      const n = new Notification(title, notifOptions);
      n.onclick = () => {
        window.focus();
        if (taskId) {
          window.location.href = `/tasks?highlight=${taskId}`;
        }
        n.close();
      };
    } catch (err) {
      console.warn('[notify] browser notification error:', err);
    }
  }
}
