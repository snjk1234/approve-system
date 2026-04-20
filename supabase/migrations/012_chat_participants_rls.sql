/**
 * MIGRATION 012: Fix RLS policy for chat_participants to show other users in chat list
 */

-- مسح السياسة القديمة التي تسبب المشكلة
DROP POLICY IF EXISTS "Users can view chat participants" ON public.chat_participants;

-- إضافة سياسة صحيحة تسمح للمستخدم برؤية جميع المشاركين في محادثاته
CREATE POLICY "Users can view chat participants" ON public.chat_participants
FOR SELECT 
USING (
    chat_id IN (
        SELECT chat_id 
        FROM public.chat_participants 
        WHERE user_id = auth.uid()
    )
);
