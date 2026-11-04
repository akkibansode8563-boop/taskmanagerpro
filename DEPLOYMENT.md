# Deployment & Setup Guide

## 1. Supabase Database Migration
Execute the migration scripts in the Supabase SQL Editor:
1. `supabase/migrations/20261104120000_realtime_and_push.sql`
   - Adds `tasks` and `meetings` to `supabase_realtime` publication.
   - Sets `replica identity full` for accurate deletes.
   - Creates `device_tokens` and `push_subscriptions` tables with Row Level Security.
   - Adds `reminder_sent_at` column and reset trigger to `tasks`.

## 2. Web Push (VAPID) Setup
1. Generate a new VAPID key pair:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Copy the **Public Key** to your frontend environment variables:
   - In `.env.local` / Vercel Environment Variables:
     `NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your-public-key>`
3. Set the Supabase Edge Function secrets:
   ```bash
   supabase secrets set VAPID_PUBLIC_KEY="<your-public-key>"
   supabase secrets set VAPID_PRIVATE_KEY="<your-private-key>"
   supabase secrets set VAPID_SUBJECT="mailto:admin@taskmasterpro.local"
   ```

## 3. Android Firebase Cloud Messaging (FCM) Setup
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a project (or select your existing project).
2. Add an Android app with package name `com.dcc.taskmasterpro`.
3. Download `google-services.json` and place it in the `android/app/` directory:
   `android/app/google-services.json`
4. Generate a Service Account Private Key:
   - In Firebase Console, go to **Project Settings** > **Service accounts**.
   - Click **Generate new private key** and download the JSON file.
   - Set this as a Supabase secret (compact JSON string):
     ```bash
     supabase secrets set FIREBASE_SERVICE_ACCOUNT='{"project_id":"...","client_email":"...","private_key":"..."}'
     ```
5. Synchronize Capacitor native assets:
   ```bash
   npx cap sync android
   ```

## 4. Deploy Supabase Edge Function & Cron Job
1. Deploy the `send-reminders` edge function:
   ```bash
   supabase functions deploy send-reminders --no-verify-jwt
   ```
2. Set up the 1-minute cron job in Supabase SQL Editor using `pg_cron` and `pg_net`:
   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;

   select cron.schedule(
     'dispatch-task-reminders',
     '* * * * *',
     $$
     select net.http_post(
       url := 'https://<your-project-ref>.supabase.co/functions/v1/send-reminders',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer <your-anon-or-service-key>'
       ),
       body := '{}'::jsonb
     ) as request_id;
     $$
   );
   ```

## 5. Vercel Deployment
1. Import or redeploy the repository in Vercel.
2. Ensure the following environment variables are configured:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
3. Confirm deployment health:
   - Check `https://<your-deployment-url>/api/health`
   - Click the notification bell in the header and click **Enable Notifications**.

## 6. Post-Deploy & Verification Checklist
1. **Cross-device Realtime Sync**: Edit a task on desktop; verify the Android app updates in <1 second with the "Live" indicator active.
2. **Background Desktop Alerts**: Set a reminder 2 minutes in advance. Minimize the browser. Observe system notification via Windows/Mac Action Center. Clicking deep-links into `/tasks?highlight=<id>`.
3. **Android Alerts**: Test with app foregrounded, backgrounded, and closed. Verify the `task-reminders` channel fires.
4. **Offline Queue Sync**: Turn on Airplane mode, edit a task, turn off Airplane mode, and verify sync flushes seamlessly without duplicates.
