/**
 * MIGRATION: Fix Approval Steps RLS for Visibility and Transitions
 * 
 * Problem: 
 * 1. Approvers could only see their own steps, making it impossible to see previous approvers and comments.
 * 2. Approvers could not update the NEXT person's step status to 'pending' because they only had update rights to their own step.
 *
 * Solution:
 * Change the RLS policies so that if you are an approver on a document, you can SELECT and UPDATE all steps within that document.
 * The Next.js API route ensures you can only act on your own step and safely transition the next one.
 */

-- 1. Fix Select Policy (Visibility)
DROP POLICY IF EXISTS "approval_steps_select" ON public.approval_steps;
CREATE POLICY "approval_steps_select" ON public.approval_steps FOR SELECT USING (
    public.check_is_document_approver(document_id) 
    OR 
    public.check_is_document_creator(document_id)
);

-- 2. Fix Update Policy (State Transition)
DROP POLICY IF EXISTS "approval_steps_update" ON public.approval_steps;
CREATE POLICY "approval_steps_update" ON public.approval_steps FOR UPDATE USING (
    public.check_is_document_approver(document_id) 
    OR 
    public.check_is_document_creator(document_id)
);
