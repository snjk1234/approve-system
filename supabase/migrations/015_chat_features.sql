-- =========================================================
-- Migration 015: Advanced Chat Features
-- Adds: reply-to, reactions, delete-for-all, pin, voice,
--        online status, link preview, in-chat search, folders
-- =========================================================

-- 1. Messages: reply_to_id (Reply Feature)
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- 2. Messages: reactions (JSONB map of emoji -> user_ids[])
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;

-- 3. Messages: deleted_for_all flag
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS deleted_for_all boolean DEFAULT false;

-- 4. Messages: voice_url (for voice message recordings)
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS voice_url text;

-- 5. Messages: message_type enum-like field
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image', 'file', 'link'));

-- 6. Messages: link_preview (JSONB with title, description, image, url)
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS link_preview jsonb;

-- 7. Chats: pinned_message_id
ALTER TABLE public.chats
    ADD COLUMN IF NOT EXISTS pinned_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- 8. Profiles: online_status and last_seen
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now();

-- 9. Chat participants: chat folder/category
ALTER TABLE public.chat_participants
    ADD COLUMN IF NOT EXISTS folder text DEFAULT 'all' CHECK (folder IN ('all', 'personal', 'work', 'unread', 'archived'));

-- 10. Update RLS: allow users to update their own messages (delete for all)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own messages') THEN
        CREATE POLICY "Users can update their own messages" ON public.messages
            FOR UPDATE USING (sender_id = auth.uid());
    END IF;
END $$;

-- 11. Allow users to update reactions on any message in their chats
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update messages in their chats') THEN
        CREATE POLICY "Users can update messages in their chats" ON public.messages
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM public.chat_participants
                    WHERE chat_participants.chat_id = messages.chat_id
                    AND chat_participants.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- 12. Allow users to update their own chats (for pinning)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Participants can update their chats') THEN
        CREATE POLICY "Participants can update their chats" ON public.chats
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM public.chat_participants
                    WHERE chat_participants.chat_id = chats.id
                    AND chat_participants.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- 13. Function to update last_seen and online status
CREATE OR REPLACE FUNCTION public.update_user_presence(user_id uuid, online boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles
    SET is_online = online, last_seen = now()
    WHERE id = user_id;
END;
$$;
