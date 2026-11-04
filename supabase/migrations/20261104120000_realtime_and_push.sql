-- Phase 1 & 5 Migration: Realtime publication, full replica identity, push subscriptions, device tokens, and reminder tracking

-- 1. Add tables to supabase_realtime publication idempotently
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meetings'
  ) then
    alter publication supabase_realtime add table public.meetings;
  end if;
end $$;

-- 2. Full replica identity for accurate DELETE / UPDATE filtering in realtime
alter table public.tasks replica identity full;
alter table public.meetings replica identity full;

-- 3. Add reminder_sent_at column to tasks
alter table public.tasks add column if not exists reminder_sent_at timestamptz;

-- 4. Trigger to reset reminder_sent_at when reminder_at changes
create or replace function public.handle_task_reminder_reset()
returns trigger
language plpgsql
as $$
begin
  -- If reminder_at was modified, reset reminder_sent_at to null so the new reminder fires
  if (old.reminder_at is distinct from new.reminder_at) then
    new.reminder_sent_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists reset_task_reminder_sent_at on public.tasks;
create trigger reset_task_reminder_sent_at
before update on public.tasks
for each row execute function public.handle_task_reminder_reset();

-- 5. Native device tokens table (Android FCM / iOS APNS)
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_device_tokens_updated_at on public.device_tokens;
create trigger set_device_tokens_updated_at
before update on public.device_tokens
for each row execute function public.handle_updated_at();

alter table public.device_tokens enable row level security;

create policy "Users can read own device tokens"
on public.device_tokens for select
using (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can insert own device tokens"
on public.device_tokens for insert
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can update own device tokens"
on public.device_tokens for update
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can delete own device tokens"
on public.device_tokens for delete
using (auth.uid() is not null and auth.uid() = user_id);

create index if not exists device_tokens_user_id_idx on public.device_tokens(user_id);

-- 6. Web push subscriptions table (VAPID)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_push_subscriptions_updated_at on public.push_subscriptions;
create trigger set_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute function public.handle_updated_at();

alter table public.push_subscriptions enable row level security;

create policy "Users can read own push subscriptions"
on public.push_subscriptions for select
using (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can insert own push subscriptions"
on public.push_subscriptions for insert
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can update own push subscriptions"
on public.push_subscriptions for update
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can delete own push subscriptions"
on public.push_subscriptions for delete
using (auth.uid() is not null and auth.uid() = user_id);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- 7. Indexes for send-reminders edge function lookups
create index if not exists tasks_reminder_cron_idx 
on public.tasks(reminder_at, status, reminder_sent_at) 
where reminder_at is not null and status != 'COMPLETED' and reminder_sent_at is null;
