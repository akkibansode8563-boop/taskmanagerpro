# TaskMaster Pro

TaskMaster Pro is a Next.js 15 + React 19 productivity workspace for managing tasks, meetings, reminders, and execution analytics on top of Firebase.

## What Is Included

- Google and email/password authentication with clearer error handling
- Task workflows with status, priority, category, reminders, and sharing
- Meeting workflows with status, attendees, location, minutes, and sharing
- Dashboard insights for overdue work, weekly focus, status mixes, and execution trends
- Firestore-backed real-time lists with route protection and browser notifications
- CI-ready lint, typecheck, and production build verification

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS + shadcn/ui
- Firebase Authentication
- Cloud Firestore
- Recharts

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create your local environment file:

```bash
cp .env.example .env.local
```

3. Update `.env.local` with your Firebase web app values if you are not using the bundled project defaults.

4. Start the app:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

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

## Firebase Setup

Make sure the Firebase project has:

- Authentication enabled for `Google` and `Email/Password`
- Authorized domains configured for `localhost`, `127.0.0.1`, and your deployed domain
- Cloud Firestore created in production or test mode as appropriate
- Security rules deployed from [firestore.rules](C:\Users\DCC\studio-main\firestore.rules)
- Indexes deployed from [firestore.indexes.json](C:\Users\DCC\studio-main\firestore.indexes.json)

Deploy Firestore config with the Firebase CLI:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Deployment Notes

- The app reads Firebase config from public environment variables in production, with local fallback values in [config.ts](C:\Users\DCC\studio-main\src\firebase\config.ts).
- CI is configured in [ci.yml](C:\Users\DCC\studio-main\.github\workflows\ci.yml).
- Production builds now run real typechecking and linting through Next.js instead of skipping them.

## Recommended Next Steps

- Replace the fallback Firebase values with your own production environment values
- Add a custom domain and register it in Firebase Authentication
- Connect GitHub Actions secrets if you want automated deploys
- Expand Firestore rules further if team collaboration is introduced
