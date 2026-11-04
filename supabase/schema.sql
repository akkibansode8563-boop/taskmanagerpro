create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default '00000000-0000-0000-0000-000000000000'::uuid,
  email text,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  last_login_at timestamptz
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
  name text not null,
  details text,
  category text,
  due_at timestamptz not null,
  reminder_at timestamptz,
  reminder_sent_at timestamptz,
  priority text not null check (priority in ('HIGH', 'MEDIUM', 'LOW')),
  status text not null check (status in ('TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED')),
  was_carried_forward boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
  title text not null,
  subtitle text,
  location text,
  attendees text,
  scheduled_at timestamptz not null,
  status text not null check (status in ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  minutes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.handle_updated_at();

drop trigger if exists set_meetings_updated_at on public.meetings;
create trigger set_meetings_updated_at
before update on public.meetings
for each row execute function public.handle_updated_at();

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.meetings enable row level security;

create policy "Public read profiles" on public.profiles for select using (true);
create policy "Public insert profiles" on public.profiles for insert with check (true);
create policy "Public update profiles" on public.profiles for update using (true) with check (true);

create policy "Public read tasks" on public.tasks for select using (true);
create policy "Public insert tasks" on public.tasks for insert with check (true);
create policy "Public update tasks" on public.tasks for update using (true) with check (true);
create policy "Public delete tasks" on public.tasks for delete using (true);

create policy "Public read meetings" on public.meetings for select using (true);
create policy "Public insert meetings" on public.meetings for insert with check (true);
create policy "Public update meetings" on public.meetings for update using (true) with check (true);
create policy "Public delete meetings" on public.meetings for delete using (true);

create index if not exists tasks_user_id_updated_at_idx on public.tasks(user_id, updated_at desc);
create index if not exists tasks_user_id_due_at_idx on public.tasks(user_id, due_at asc);
create index if not exists meetings_user_id_updated_at_idx on public.meetings(user_id, updated_at desc);
create index if not exists meetings_user_id_scheduled_at_idx on public.meetings(user_id, scheduled_at asc);

-- Enable Realtime publication & full replica identity
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

alter table public.tasks replica identity full;
alter table public.meetings replica identity full;

-- Reset reminder_sent_at when reminder_at is updated
create or replace function public.handle_task_reminder_reset()
returns trigger
language plpgsql
as $$
begin
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

-- Device tokens for native push (FCM / APNS)
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
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

create policy "Public read device tokens" on public.device_tokens for select using (true);
create policy "Public insert device tokens" on public.device_tokens for insert with check (true);
create policy "Public update device tokens" on public.device_tokens for update using (true) with check (true);
create policy "Public delete device tokens" on public.device_tokens for delete using (true);

create index if not exists device_tokens_user_id_idx on public.device_tokens(user_id);

-- Web push subscriptions (VAPID)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
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

create policy "Public read push subscriptions" on public.push_subscriptions for select using (true);
create policy "Public insert push subscriptions" on public.push_subscriptions for insert with check (true);
create policy "Public update push subscriptions" on public.push_subscriptions for update using (true) with check (true);
create policy "Public delete push subscriptions" on public.push_subscriptions for delete using (true);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
create index if not exists tasks_reminder_cron_idx 
on public.tasks(reminder_at, status, reminder_sent_at) 
where reminder_at is not null and status != 'COMPLETED' and reminder_sent_at is null;
