# TaskMaster Pro – Scaling Recommendations

This document outlines architectural recommendations to scale TaskMaster Pro to millions of active users.

---

## 1. Database Scaling & Pooling

### 1.1 Connection Pooling
- **Problem**: Direct PostgreSQL connections can quickly saturate as user traffic climbs.
- **Solution**: Configure **Supabase Connection Pooling** via PgBouncer or Supabase Supavisor. Always direct application serverless API routes to the pooled port (`5432` or transaction mode port `6543`).

### 1.2 Database Read Replicas
- Move read-heavy operations (e.g. public dashboard widgets, statistics summaries) to PostgreSQL read replicas to free up the primary writer node.

---

## 2. API Caching & CDN

- **Vercel Edge Caching**: Use Next.js stale-while-revalidate headers on public and static routes.
- **Supabase CDN Cache**: Cache static REST requests on a global CDN.

---

## 3. Large-List Pagination

- **Current Behavior**: Hooks fetch all user tasks and meetings in a single query.
- **Scaling Recommendation**:
  - Implement infinite scroll or cursor-based pagination (`limit` and `offset` filters) in `useTasks` and `useMeetings`.
  - Fetch a maximum of 50 items initially, loading subsequent pages as the user scrolls.

---

## 4. Realtime Connection Limits

- Supabase Realtime has connection limits on the free/pro tiers. For extreme scale:
  - Consolidate Postgres change channels, or restrict realtime listeners only to views where collaborative editing is active.
  - Disable realtime subscriptions for inactive background tabs.
