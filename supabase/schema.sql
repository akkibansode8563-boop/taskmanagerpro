create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  last_login_at timestamptz
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  details text,
  category text,
  due_at timestamptz not null,
  reminder_at timestamptz,
  priority text not null check (priority in ('HIGH', 'MEDIUM', 'LOW')),
  status text not null check (status in ('TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED')),
  was_carried_forward boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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

create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() is not null and auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() is not null and auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() is not null and auth.uid() = id)
with check (auth.uid() is not null and auth.uid() = id);

create policy "Users can read own tasks"
on public.tasks for select
using (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can insert own tasks"
on public.tasks for insert
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can update own tasks"
on public.tasks for update
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can delete own tasks"
on public.tasks for delete
using (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can read own meetings"
on public.meetings for select
using (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can insert own meetings"
on public.meetings for insert
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can update own meetings"
on public.meetings for update
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can delete own meetings"
on public.meetings for delete
using (auth.uid() is not null and auth.uid() = user_id);

create index if not exists tasks_user_id_updated_at_idx on public.tasks(user_id, updated_at desc);
create index if not exists tasks_user_id_due_at_idx on public.tasks(user_id, due_at asc);
create index if not exists meetings_user_id_updated_at_idx on public.meetings(user_id, updated_at desc);
create index if not exists meetings_user_id_scheduled_at_idx on public.meetings(user_id, scheduled_at asc);
