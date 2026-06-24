# TaskMaster Pro – Disaster Recovery Plan

This plan outlines steps, roles, and procedures for responding to outages, database corruption, or system compromises in production.

---

## 1. System Outage Triage

### 1.1 Outage Detection
- Trigger automated alert checks using monitoring tools (e.g. Sentry/Datadog) when API routes or health endpoints return `5xx` responses.
- Check Supabase status page (`status.supabase.com`) and Vercel status page (`www.vercel-status.com`).

### 1.2 Outage Response Steps
1. **Identify the root cause**: Check the Next.js and Supabase logs.
2. **Enable Maintenance Mode**: If the system is unstable, toggle a Vercel feature flag to redirect traffic to a static maintenance page.
3. **Data Protection**: If database connectivity is down, the client app's offline queue will cache mutations in browser storage. Instruct users not to clear browser storage to prevent loss of queued edits.

---

## 2. Database Recovery (Supabase PITR)

- **Point-In-Time Recovery**: Supabase Pro/Enterprise plans include daily backups and point-in-time recovery.
- **Rollback Process**:
  1. Navigate to the Supabase Dashboard.
  2. Select your project -> **Database -> Backups**.
  3. Choose the target snapshot time (just before the incident occurred) and trigger a recovery.
  4. Once restored, verify integrity by fetching user profiles.

---

## 3. Communication Plan

- Notify team and users of scheduled downtime or outages.
- Provide regular updates via email or status pages.
