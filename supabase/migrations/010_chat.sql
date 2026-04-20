-- حذف السياسة القديمة إن وجدت لتجنب التعارض
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Users can add participants" ON public.chat_participants;

-- إضافة سياسة إنشاء المحادثات (تسمح للمستخدم بإنشاء محادثة إذا كان هو الـ created_by)
CREATE POLICY "Users can create chats" ON public.chats
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- إضافة سياسة إضافة المشاركين (تسمح للمستخدم بإضافة نفسه أو غيره للمحادثة التي يشارك فيها)
CREATE POLICY "Users can add participants" ON public.chat_participants
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.chats WHERE id = chat_id AND created_by = auth.uid()
));
