# Deployment Guide

## Vercel

1. Import the GitHub repository into Vercel.
2. Keep the framework preset as `Next.js`.
3. Set the root directory to the project root.
4. Add these environment variables in Vercel for every environment you use:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL`
5. Add this server-only variable where needed for data migration or secure admin scripts:
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Deploy once, then copy the production URL and add it to Supabase Auth:
   - Site URL
   - Redirect URLs

Recommended values:

- Production `NEXT_PUBLIC_APP_URL`: `https://taskmanagerproapp.co`
- Preview `NEXT_PUBLIC_APP_URL`: leave unset if you want the app to fall back to the current browser origin
- Local `NEXT_PUBLIC_APP_URL`: `http://localhost:3000`

## Post-Deploy Checks

1. Open `/api/health` and confirm it returns `status: ok`.
2. Test email sign-up.
3. Test email sign-in.
4. Test Google sign-in.
5. Create, edit, and delete a task.
6. Create, edit, and delete a meeting.
7. Confirm dashboard analytics update after writes.

## Supabase Auth URLs

Add all URLs you actually use:

- `http://localhost:3000/login`
- `https://taskmanagerproapp.co/login`
- `https://www.taskmanagerproapp.co/login`
- your Vercel preview URL login path if you plan to test OAuth on previews
