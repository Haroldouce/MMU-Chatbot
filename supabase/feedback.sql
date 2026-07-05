-- User feedback & unresolved queries. Run in Supabase SQL Editor.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  user_email text not null,
  feedback_type text not null check (feedback_type in ('unresolved_query', 'feedback')),
  message text not null,
  status text not null default 'new' check (status in ('new', 'reviewed')),
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);
create index if not exists feedback_status_idx on public.feedback (status);

alter table public.feedback enable row level security;

drop policy if exists "Users insert own feedback" on public.feedback;
create policy "Users insert own feedback"
  on public.feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users read own feedback" on public.feedback;
create policy "Users read own feedback"
  on public.feedback for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins read all feedback" on public.feedback;
create policy "Admins read all feedback"
  on public.feedback for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins update feedback" on public.feedback;
create policy "Admins update feedback"
  on public.feedback for update
  to authenticated
  using ((select public.is_admin()));
