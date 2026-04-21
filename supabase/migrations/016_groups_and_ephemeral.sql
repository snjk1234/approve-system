-- =========================================================
-- Migration 016: Groups and Ephemeral Messages
-- Adds: group chats support, user roles in chats, and self-destructing messages
-- =========================================================

-- 1. Chats: Add type, name, and avatar for groups
ALTER TABLE public.chats
    ADD COLUMN IF NOT EXISTS type text DEFAULT 'private' CHECK (type IN ('private', 'group')),
    ADD COLUMN IF NOT EXISTS name text,
    ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Chat Participants: Add role (admin/member)
ALTER TABLE public.chat_participants
    ADD COLUMN IF NOT EXISTS role text DEFAULT 'member' CHECK (role IN ('admin', 'member'));

-- 3. Messages: Add expiration timestamp for self-destructing messages
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 4. Create an index to quickly find expired messages
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON public.messages(expires_at) WHERE expires_at IS NOT NULL;

-- 5. Create a function to automatically delete expired messages
-- This function can be called via pg_cron or manually/periodically from Edge Functions
CREATE OR REPLACE FUNCTION public.delete_expired_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete messages where the current time is past the expires_at time
    DELETE FROM public.messages WHERE expires_at IS NOT NULL AND now() > expires_at;
END;
$$;

-- 6. Update RLS: Allow group admins to update the chat (name, avatar, pinning)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Group admins can update their groups') THEN
        CREATE POLICY "Group admins can update their groups" ON public.chats
            FOR UPDATE USING (
                type = 'group' AND EXISTS (
                    SELECT 1 FROM public.chat_participants
                    WHERE chat_participants.chat_id = chats.id
                    AND chat_participants.user_id = auth.uid()
                    AND chat_participants.role = 'admin'
                )
            );
    END IF;
END $$;
