-- Migration: Remove authentication requirements and enable open workspace access

-- 1. Drop foreign key constraints on user_id referencing auth.users
alter table public.tasks drop constraint if exists tasks_user_id_fkey;
alter table public.meetings drop constraint if exists meetings_user_id_fkey;
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.device_tokens drop constraint if exists device_tokens_user_id_fkey;
alter table public.push_subscriptions drop constraint if exists push_subscriptions_user_id_fkey;

-- 2. Provide sensible default workspace user_id
alter table public.tasks alter column user_id set default '00000000-0000-0000-0000-000000000000'::uuid;
alter table public.meetings alter column user_id set default '00000000-0000-0000-0000-000000000000'::uuid;
alter table public.device_tokens alter column user_id set default '00000000-0000-0000-0000-000000000000'::uuid;
alter table public.push_subscriptions alter column user_id set default '00000000-0000-0000-0000-000000000000'::uuid;

-- 3. Replace user-restricted RLS policies with open workspace access policies

-- Tasks
drop policy if exists "Users can read own tasks" on public.tasks;
drop policy if exists "Users can insert own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Users can delete own tasks" on public.tasks;
drop policy if exists "Public read tasks" on public.tasks;
drop policy if exists "Public insert tasks" on public.tasks;
drop policy if exists "Public update tasks" on public.tasks;
drop policy if exists "Public delete tasks" on public.tasks;

create policy "Public read tasks" on public.tasks for select using (true);
create policy "Public insert tasks" on public.tasks for insert with check (true);
create policy "Public update tasks" on public.tasks for update using (true) with check (true);
create policy "Public delete tasks" on public.tasks for delete using (true);

-- Meetings
drop policy if exists "Users can read own meetings" on public.meetings;
drop policy if exists "Users can insert own meetings" on public.meetings;
drop policy if exists "Users can update own meetings" on public.meetings;
drop policy if exists "Users can delete own meetings" on public.meetings;
drop policy if exists "Public read meetings" on public.meetings;
drop policy if exists "Public insert meetings" on public.meetings;
drop policy if exists "Public update meetings" on public.meetings;
drop policy if exists "Public delete meetings" on public.meetings;

create policy "Public read meetings" on public.meetings for select using (true);
create policy "Public insert meetings" on public.meetings for insert with check (true);
create policy "Public update meetings" on public.meetings for update using (true) with check (true);
create policy "Public delete meetings" on public.meetings for delete using (true);

-- Profiles
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Public read profiles" on public.profiles;
drop policy if exists "Public insert profiles" on public.profiles;
drop policy if exists "Public update profiles" on public.profiles;

create policy "Public read profiles" on public.profiles for select using (true);
create policy "Public insert profiles" on public.profiles for insert with check (true);
create policy "Public update profiles" on public.profiles for update using (true) with check (true);

-- Device Tokens
drop policy if exists "Users can read own device tokens" on public.device_tokens;
drop policy if exists "Users can insert own device tokens" on public.device_tokens;
drop policy if exists "Users can update own device tokens" on public.device_tokens;
drop policy if exists "Users can delete own device tokens" on public.device_tokens;
drop policy if exists "Public read device tokens" on public.device_tokens;
drop policy if exists "Public insert device tokens" on public.device_tokens;
drop policy if exists "Public update device tokens" on public.device_tokens;
drop policy if exists "Public delete device tokens" on public.device_tokens;

create policy "Public read device tokens" on public.device_tokens for select using (true);
create policy "Public insert device tokens" on public.device_tokens for insert with check (true);
create policy "Public update device tokens" on public.device_tokens for update using (true) with check (true);
create policy "Public delete device tokens" on public.device_tokens for delete using (true);

-- Push Subscriptions
drop policy if exists "Users can read own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can insert own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can update own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can delete own push subscriptions" on public.push_subscriptions;
drop policy if exists "Public read push subscriptions" on public.push_subscriptions;
drop policy if exists "Public insert push subscriptions" on public.push_subscriptions;
drop policy if exists "Public update push subscriptions" on public.push_subscriptions;
drop policy if exists "Public delete push subscriptions" on public.push_subscriptions;

create policy "Public read push subscriptions" on public.push_subscriptions for select using (true);
create policy "Public insert push subscriptions" on public.push_subscriptions for insert with check (true);
create policy "Public update push subscriptions" on public.push_subscriptions for update using (true) with check (true);
create policy "Public delete push subscriptions" on public.push_subscriptions for delete using (true);

-- 4. Ensure default workspace profile row exists
insert into public.profiles (id, email, display_name)
values ('00000000-0000-0000-0000-000000000000', 'workspace@taskmasterpro.local', 'Workspace')
on conflict (id) do nothing;
