/**
 * MIGRATION 009: Add INSERT policies for chats and chat_participants
 */

-- Allow authenticated users to insert new chats
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can create chats') then
    create policy "Users can create chats" on chats
      for insert with check (auth.role() = 'authenticated');
  end if;
end $$;

-- Allow authenticated users to add participants to chats
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can add participants') then
    create policy "Users can add participants" on chat_participants
      for insert with check (auth.role() = 'authenticated');
  end if;
end $$;
