-- Run in Supabase SQL Editor after creating conversations + messages tables.
-- Maps app role "assistant" to DB role "administrator".

alter table conversations enable row level security;
alter table messages enable row level security;

create policy "Users read own conversations"
  on conversations for select
  using (auth.uid() = user_id);

create policy "Users insert own conversations"
  on conversations for insert
  with check (auth.uid() = user_id);

create policy "Users update own conversations"
  on conversations for update
  using (auth.uid() = user_id);

create policy "Users delete own conversations"
  on conversations for delete
  using (auth.uid() = user_id);

create policy "Users read messages in own conversations"
  on messages for select
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users insert messages in own conversations"
  on messages for insert
  with check (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users delete messages in own conversations"
  on messages for delete
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );
