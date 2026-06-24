# TaskMaster Pro – Monitoring Setup

This document details the configuration for error logging, user metrics tracking, and server monitoring in TaskMaster Pro.

---

## 1. Application Health Checking

We have implemented an API endpoint for heartbeat checks:
- **Route**: [`/api/health`](file:///d:/MyApps/taskmanagerpro-main/taskmanagerpro-main/src/app/api/health/route.ts)
- **Response**: Returns a JSON object with `{ status: 'ok', time: '...' }` and a `200` HTTP status.
- **Monitoring Setup**: Configure external uptime services (e.g. Uptime Robot, Better Uptime) to ping `/api/health` every 60 seconds to detect server crashes.

---

## 2. Telemetry and Logging

The telemetry layer is defined at [`src/lib/telemetry.ts`](file:///d:/MyApps/taskmanagerpro-main/taskmanagerpro-main/src/lib/telemetry.ts).

### 2.1 Integrating Sentry (Errors)
1. Install Sentry dependencies:
   ```bash
   npm install @sentry/nextjs
   ```
2. Enable by setting:
   ```env
   NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn-url
   ```
3. Custom errors caught in try-catch blocks are sent to Sentry via `telemetry.captureError(error, context)`.

### 2.2 Analytics (Page Views & Actions)
- Enable Google Analytics or custom trackers by configuring:
  ```env
  NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
  ```
- Events are dispatched via `telemetry.logEvent(name, properties)`.
