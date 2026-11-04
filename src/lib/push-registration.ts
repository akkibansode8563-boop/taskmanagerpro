'use client';

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { cancelMatchingLocalReminder } from '@/lib/mobile-reminders';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

let isPushListenersAttached = false;

/**
 * Registers device push tokens into Supabase.
 * - On Native Android: registers FCM token into public.device_tokens
 * - On Web Browser: registers Web Push VAPID subscription into public.push_subscriptions
 */
export async function registerPushForUser(
  supabase: SupabaseClient,
  user: User,
  onNavigate?: (url: string) => void
) {
  if (typeof window === 'undefined' || !user) return;

  // 1. Native Android / iOS path (Capacitor FCM)
  if (Capacitor.isNativePlatform()) {
    try {
      const permStatus = await PushNotifications.checkPermissions();
      let receive = permStatus.receive;

      if (receive !== 'granted') {
        const requested = await PushNotifications.requestPermissions();
        receive = requested.receive;
      }

      if (receive === 'granted') {
        if (!isPushListenersAttached) {
          await PushNotifications.addListener('registration', async (token) => {
            try {
              const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
              await supabase.from('device_tokens').upsert(
                {
                  user_id: user.id,
                  token: token.value,
                  platform,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'token' }
              );
            } catch (err) {
              console.warn('[push-registration] device_token upsert error:', err);
            }
          });

          await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
            const taskId = notification.data?.taskId || notification.data?.task_id;
            if (taskId) {
              // Deduplicate: cancel pending local notification for this task
              await cancelMatchingLocalReminder(taskId);
            }
          });

          await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            const data = notification.notification.data;
            const targetUrl = data?.url || (data?.taskId ? `/tasks?highlight=${data.taskId}` : '/tasks');
            if (onNavigate) {
              onNavigate(targetUrl);
            } else if (typeof window !== 'undefined') {
              window.location.href = targetUrl;
            }
          });

          isPushListenersAttached = true;
        }

        await PushNotifications.register();
      }
    } catch (err) {
      console.warn('[push-registration] native push registration error:', err);
    }
    return;
  }

  // 2. Web Browser Push path (VAPID)
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    // VAPID key not configured yet in environment
    return;
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    if (subscription) {
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');

      if (p256dhKey && authKey) {
        const p256dh = btoa(String.fromCharCode(...new Uint8Array(p256dhKey)));
        const auth = btoa(String.fromCharCode(...new Uint8Array(authKey)));

        await supabase.from('push_subscriptions').upsert(
          {
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh,
            auth,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'endpoint' }
        );
      }
    }
  } catch (err) {
    console.warn('[push-registration] web push subscription error:', err);
  }
}

/**
 * Removes device token or web push subscription on logout
 */
export async function unregisterPushForUser(supabase: SupabaseClient, user: User) {
  if (typeof window === 'undefined' || !user) return;

  if (Capacitor.isNativePlatform()) {
    try {
      // Remove all tokens for this user on this device
      await supabase.from('device_tokens').delete().eq('user_id', user.id);
    } catch (err) {
      console.warn('[push-registration] unregister device token error:', err);
    }
    return;
  }

  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
    } catch (err) {
      console.warn('[push-registration] unregister web push error:', err);
    }
  }
}
