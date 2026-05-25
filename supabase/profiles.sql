-- Matches your existing profiles table + policies.
-- Run only the parts you still need (skip CREATE TABLE if it already exists).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text
);

-- Required for "Admins can view all profiles" policy
alter table public.profiles
  add column if not exists role text default 'user';

alter table public.profiles enable row level security;

-- Your existing policies (safe to re-run with IF NOT EXISTS pattern via drop/create)
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = profiles.id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- SECURITY DEFINER avoids infinite recursion (policy must not query profiles directly)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles
  for select
  to authenticated
  using ((select public.is_admin()));

-- Lets the app create a row on first visit if signup trigger did not run
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'username'), ''),
      split_part(new.email, '@', 1)
    ),
    'user'
  )
  on conflict (id) do update
  set username = coalesce(public.profiles.username, excluded.username);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
