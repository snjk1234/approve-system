/**
 * MIGRATION 013: Fix infinite recursion in chat_participants RLS
 */

-- 1. مسح السياسة القديمة التي سببت الدوران اللانهائي (Infinite Recursion)
DROP POLICY IF EXISTS "Users can view chat participants" ON public.chat_participants;

-- 2. إنشاء دالة آمنة (Security Definer) تتجاوز قيود RLS للتحقق من المشاركة
CREATE OR REPLACE FUNCTION public.is_chat_participant(chat_id_input uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_id = chat_id_input AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. إضافة سياسة جديدة تعتمد على الدالة الآمنة
CREATE POLICY "Users can view chat participants" ON public.chat_participants
FOR SELECT 
USING (
    user_id = auth.uid() OR public.is_chat_participant(chat_id)
);
