# TaskMaster Pro – Backup Strategy

This document details the scheduling, formats, and retention rules for database backups.

---

## 1. Automated Supabase Backups

Supabase manages physical backups automatically at the database level:
- **Frequency**:
  - Free Tier: Not automated. Manual backup recommended.
  - Pro/Enterprise Tier: Daily automated backups.
- **Retention**: Daily backups are retained for 7 days (Pro) or 30 days (Enterprise).
- **Execution Location**: Supabase Dashboard -> Project Settings -> Database -> Backups.

---

## 2. Manual Backup & Schema Export

To manually backup the database schema and data:

1. **Schema Export (SQL)**:
   Ensure you have the Supabase CLI installed, then run:
   ```bash
   supabase db dump --local > schema_backup.sql
   ```
2. **Data Export**:
   Export table records into SQL insert scripts:
   ```bash
   supabase db dump --local --data-only > data_backup.sql
   ```
3. Keep backups in secure, off-site cloud storage. Never check backups containing user data into public Git repositories.
