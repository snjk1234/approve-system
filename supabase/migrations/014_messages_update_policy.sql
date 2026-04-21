-- Add UPDATE policy for messages table so users can mark them as read
DO $$ 
BEGIN
  if not exists (select 1 from pg_policies where policyname = 'Users can update messages in their chats') then
    create policy "Users can update messages in their chats" on public.messages
      for update using (
        exists (
          select 1 from public.chat_participants
          where chat_participants.chat_id = messages.chat_id
          and chat_participants.user_id = auth.uid()
        )
      );
  end if;
END $$;
