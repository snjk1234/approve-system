/**
 * MIGRATION 019: Allow inserting approval steps
 * This fixes the error: 'new row violates row-level security policy for table "approval_steps"'
 */

-- 1. Allow authenticated users to insert approval steps
-- Use the security definer function to avoid recursion
DROP POLICY IF EXISTS "Creators can insert steps for their documents" ON public.approval_steps;
CREATE POLICY "Creators can insert steps for their documents" ON public.approval_steps
FOR INSERT WITH CHECK (
  public.check_is_document_creator(document_id)
);

-- Also ensure they can see what they just inserted
DROP POLICY IF EXISTS "Users can view steps of their documents" ON public.approval_steps;
CREATE POLICY "Users can view steps of their documents" ON public.approval_steps
FOR SELECT USING (
  approver_id = auth.uid() OR public.check_is_document_creator(document_id)
);
