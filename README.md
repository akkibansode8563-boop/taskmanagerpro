# TaskMaster Pro

TaskMaster Pro is a Next.js 15 + React 19 productivity workspace backed by Supabase Auth and Postgres. It helps teams manage tasks, meetings, reminders, and execution analytics in one place.

## Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase Auth
- Supabase Postgres + Row Level Security
- Recharts

## What Is Included

- Email/password and Google sign-in with Supabase Auth
- Rich task workflow with status, priority, category, reminders, and sharing
- Rich meeting workflow with status, attendees, location, minutes, and sharing
- Dashboard analytics for overdue work, weekly focus, status mix, and execution trends
- Realtime refresh for tasks and meetings using Supabase Postgres changes
- CI-ready lint, typecheck, and build verification

## Environment Setup

Create `.env.local` from [.env.example](C:\Users\DCC\studio-main\.env.example):

```bash
cp .env.example .env.local
```

Required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

## Supabase Setup

1. Create a new Supabase project.
2. Open the SQL editor.
3. Run [schema.sql](C:\Users\DCC\studio-main\supabase\schema.sql).
4. In Authentication, enable:
   - Email/password
   - Google
5. In Authentication -> URL Configuration, set:
   - Site URL: your production app URL
   - Redirect URLs: each local, staging, and production login callback URL
6. For Google sign-in, configure the OAuth provider in Supabase and use the same callback URLs there.

Recommended redirect URLs:

- `http://localhost:3000/login`
- `https://your-domain.com/login`
- `https://www.your-domain.com/login`

## Production Rollout Checklist

1. Run [schema.sql](C:\Users\DCC\studio-main\supabase\schema.sql) in production.
2. Set the environment variables from [.env.example](C:\Users\DCC\studio-main\.env.example) in your deployment platform.
3. Add the same URLs to Supabase Auth redirect settings.
4. Enable email provider settings and Google OAuth in Supabase.
5. Import existing Firebase data, if any, before inviting users.
6. Run:
   - `npm run check`
7. Deploy only after auth, tasks, meetings, and dashboard flows work in a production preview.

## Local Development

```bash
npm install
npm run dev
```

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run build
```

Or run everything together:

```bash
npm run check
```

## Production Readiness Notes

- RLS is defined in [schema.sql](C:\Users\DCC\studio-main\supabase\schema.sql) so users can only access their own records.
- Profiles, tasks, and meetings are indexed for the main user-facing query paths.
- Auth and database config now come from environment variables instead of hardcoded Firebase values.
- A Firebase-to-Supabase import helper is available at [import-firebase-export.mjs](C:\Users\DCC\studio-main\scripts\import-firebase-export.mjs).
- CI is configured in [ci.yml](C:\Users\DCC\studio-main\.github\workflows\ci.yml).

## Migration Note

This codebase has been migrated toward Supabase. If you still have data in Firebase, export it first and import it into the Supabase `profiles`, `tasks`, and `meetings` tables before going live. The import helper expects your Supabase auth users to already exist and maps legacy records into the production schema with status normalization.
