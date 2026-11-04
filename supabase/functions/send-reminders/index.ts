// Supabase Edge Function: send-reminders
// Triggered every minute by pg_cron or HTTP invocation to dispatch FCM and Web Push alerts
// for tasks where reminder_at <= now() and reminder_sent_at is null.

import { createClient } from 'npm:@supabase/supabase-js@2.48.1';
import webpush from 'npm:web-push@3.6.7';

interface TaskRecord {
  id: string;
  user_id: string;
  name: string;
  details: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  due_at: string;
  reminder_at: string;
  status: string;
}

interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface DeviceTokenRecord {
  id: string;
  token: string;
  platform: string;
}

// Helper to acquire a Google OAuth2 access token from a service account JSON
async function getGoogleAccessToken(serviceAccount: { client_email: string; private_key: string }) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const strHeader = btoa(JSON.stringify(header));
  const strClaim = btoa(JSON.stringify(claimSet));
  const signatureInput = `${strHeader}.${strClaim}`;

  // Clean private key PEM
  const pem = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binaryDer = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const base64UrlSig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${signatureInput}.${base64UrlSig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await res.json();
  return data.access_token as string;
}

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Configure Web Push VAPID keys if provided
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@taskmasterpro.local';

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    }

    // 2. Configure Firebase credentials if provided
    const fcmServiceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    let fcmServiceAccount: { project_id: string; client_email: string; private_key: string } | null = null;
    let googleAccessToken: string | null = null;

    if (fcmServiceAccountJson) {
      try {
        fcmServiceAccount = JSON.parse(fcmServiceAccountJson);
        if (fcmServiceAccount) {
          googleAccessToken = await getGoogleAccessToken(fcmServiceAccount);
        }
      } catch (err) {
        console.warn('[send-reminders] failed to load FIREBASE_SERVICE_ACCOUNT:', err);
      }
    }

    // 3. Find pending reminders: reminder_at <= now and status != COMPLETED and reminder_sent_at is null
    const nowIso = new Date().toISOString();
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, user_id, name, details, priority, due_at, reminder_at, status')
      .lte('reminder_at', nowIso)
      .is('reminder_sent_at', null)
      .neq('status', 'COMPLETED')
      .limit(100);

    if (tasksError) {
      return new Response(JSON.stringify({ error: tasksError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending reminders to dispatch', count: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[send-reminders] Found ${tasks.length} pending reminder(s) to dispatch.`);

    const results = [];

    for (const rawTask of tasks) {
      const task = rawTask as TaskRecord;
      const notifPayload = {
        title: 'Task Reminder',
        body: task.details ? `${task.name} • ${task.details}` : `It's time for ${task.name}`,
        taskId: task.id,
        urgency: task.priority,
        url: `/tasks?highlight=${task.id}`,
        tag: `task-${task.id}`,
      };

      // 4a. Dispatch to Android FCM devices
      const { data: deviceTokens } = await supabase
        .from('device_tokens')
        .select('id, token, platform')
        .eq('user_id', task.user_id);

      if (deviceTokens && deviceTokens.length > 0) {
        for (const dev of deviceTokens as DeviceTokenRecord[]) {
          try {
            if (googleAccessToken && fcmServiceAccount?.project_id) {
              // FCM HTTP v1 API
              await fetch(
                `https://fcm.googleapis.com/v1/projects/${fcmServiceAccount.project_id}/messages:send`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${googleAccessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    message: {
                      token: dev.token,
                      notification: {
                        title: notifPayload.title,
                        body: notifPayload.body,
                      },
                      data: {
                        taskId: task.id,
                        url: notifPayload.url,
                        urgency: task.priority,
                      },
                      android: {
                        priority: task.priority === 'HIGH' ? 'high' : 'normal',
                        notification: {
                          channel_id: 'task-reminders',
                          sound: task.priority === 'HIGH' ? 'default' : undefined,
                        },
                      },
                    },
                  }),
                }
              );
            }
          } catch (fcmErr) {
            console.warn(`[send-reminders] FCM dispatch failed for token ${dev.id}:`, fcmErr);
          }
        }
      }

      // 4b. Dispatch to Web Push subscriptions (VAPID)
      const { data: webSubs } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', task.user_id);

      if (webSubs && webSubs.length > 0 && vapidPublicKey && vapidPrivateKey) {
        for (const sub of webSubs as PushSubscriptionRecord[]) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              JSON.stringify(notifPayload)
            );
          } catch (webErr: any) {
            // Delete expired endpoints on 404/410
            if (webErr?.statusCode === 404 || webErr?.statusCode === 410) {
              console.log(`[send-reminders] Subscription expired, deleting endpoint ${sub.endpoint}`);
              await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            } else {
              console.warn(`[send-reminders] Web push failed for subscription ${sub.id}:`, webErr);
            }
          }
        }
      }

      // 4c. Mark reminder as sent
      await supabase
        .from('tasks')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', task.id);

      results.push({ taskId: task.id, status: 'dispatched' });
    }

    return new Response(JSON.stringify({ success: true, count: results.length, dispatched: results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[send-reminders] unhandled error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
