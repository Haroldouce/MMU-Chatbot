-- Run after profiles.is_admin() exists (see fix_profiles_rls_recursion.sql).
-- Lets admins read platform-wide chat data for the dashboard.

drop policy if exists "Admins read all conversations" on public.conversations;
create policy "Admins read all conversations"
  on public.conversations
  for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins read all messages" on public.messages;
create policy "Admins read all messages"
  on public.messages
  for select
  to authenticated
  using ((select public.is_admin()));
