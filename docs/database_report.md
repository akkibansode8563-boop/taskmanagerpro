# TaskMaster Pro – Database Report

This report documents the Supabase PostgreSQL database schemas, row-level access controls, indexes, and offline caching structures.

---

## 1. Table Definitions

### 1.1 `public.profiles`
- **Purpose**: Tracks user workspace attributes.
- **Fields**:
  - `id` (`uuid`, Primary Key): References `auth.users(id)` with cascade deletion.
  - `email` (`text`): User email address.
  - `display_name` (`text`): User display name.
  - `created_at` (`timestamptz`): Entry creation timestamp.
  - `last_login_at` (`timestamptz`): Last authenticated sign-in time.

### 1.2 `public.tasks`
- **Purpose**: Stores individual user tasks.
- **Fields**:
  - `id` (`uuid`, Primary Key): Generated via `gen_random_uuid()`.
  - `user_id` (`uuid`): Owner reference to `auth.users(id)`.
  - `name` (`text`): Task title.
  - `details` (`text`): Description details.
  - `category` (`text`): Project tags/labels.
  - `due_at` (`timestamptz`): Due date.
  - `reminder_at` (`timestamptz`): Notification trigger timestamp.
  - `priority` (`text`): Constraints to `HIGH`, `MEDIUM`, `LOW`.
  - `status` (`text`): Constraints to `TODO`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`.
  - `was_carried_forward` (`boolean`).

### 1.3 `public.meetings`
- **Purpose**: Manages meetings schedules and notes.
- **Fields**:
  - `id` (`uuid`, Primary Key).
  - `user_id` (`uuid`): Owner reference.
  - `title` (`text`): Meeting topic.
  - `subtitle` (`text`).
  - `location` (`text`).
  - `attendees` (`text`).
  - `scheduled_at` (`timestamptz`).
  - `status` (`text`): Constraints to `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
  - `minutes` (`text`): Summary notes and minutes.

---

## 2. Row Level Security (RLS)

All tables enforce RLS, requiring `auth.uid() = user_id`/`id` for reads and writes.

---

## 3. Database Indexes

To speed up client fetches, composite indexes are configured:
- **Tasks**:
  - `tasks_user_id_updated_at_idx`: `(user_id, updated_at desc)`
  - `tasks_user_id_due_at_idx`: `(user_id, due_at asc)`
- **Meetings**:
  - `meetings_user_id_updated_at_idx`: `(user_id, updated_at desc)`
  - `meetings_user_id_scheduled_at_idx`: `(user_id, scheduled_at asc)`
