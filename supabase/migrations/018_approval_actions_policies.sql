/**
 * MIGRATION 018: Add update policies for approval steps and documents
 * This allows approvers to update their steps and developers to update document status.
 */

-- 1. Allow approvers to update their own steps (for approval/rejection)
DROP POLICY IF EXISTS "Approvers can update their own steps" ON public.approval_steps;
CREATE POLICY "Approvers can update their own steps" ON public.approval_steps
FOR UPDATE USING (approver_id = auth.uid());

-- 2. Allow the system (via API) to update document status when steps are completed
-- Since RLS is checked against the user, we need to allow updating documents 
-- if the user is an approver in one of the steps.
DROP POLICY IF EXISTS "Approvers can update document status" ON public.documents;
CREATE POLICY "Approvers can update document status" ON public.documents
FOR UPDATE USING (
  creator_id = auth.uid() OR public.check_is_document_approver(id)
);
