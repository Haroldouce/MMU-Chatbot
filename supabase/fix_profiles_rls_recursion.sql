-- Fix: infinite recursion in "Admins can view all profiles"
-- Cause: that policy SELECTs from profiles while evaluating a SELECT on profiles.
-- Run this entire script in the Supabase SQL Editor.

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
