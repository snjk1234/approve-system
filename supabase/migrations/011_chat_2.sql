-- حذف السياسة القديمة
DROP POLICY IF EXISTS "Users can see their chats" ON public.chats;

-- إنشاء سياسة جديدة تسمح لمن أنشأ المحادثة برؤيتها فوراً
CREATE POLICY "Users can see their chats" ON public.chats
FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE chat_participants.chat_id = chats.id
        AND chat_participants.user_id = auth.uid()
    )
); 
