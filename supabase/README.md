# Supabase Setup

## 1. Apply the Schema

Open the Supabase SQL editor and run [schema.sql](C:\Users\DCC\studio-main\supabase\schema.sql).

This creates:

- `profiles`
- `tasks`
- `meetings`
- row level security policies
- update timestamp triggers
- query indexes for dashboard and list screens

## 2. Configure Auth

In Supabase Authentication:

- enable email/password
- enable Google if you want social login
- set the site URL to your production app URL
- add redirect URLs for local, preview, and production environments

Recommended URLs:

- `http://localhost:3000/login`
- `https://taskmanagerproapp.co/login`
- `https://www.taskmanagerproapp.co/login`

## 3. Environment Variables

Set the values from [.env.example](C:\Users\DCC\studio-main\.env.example):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

## 4. Import Legacy Data

If you have Firebase-era data to preserve, first create the matching users in Supabase Auth, then run:

```bash
npm run supabase:import -- --input ./path/to/firebase-export.json --mapping ./path/to/user-mapping.json
```

The import script lives at [import-firebase-export.mjs](C:\Users\DCC\studio-main\scripts\import-firebase-export.mjs).
