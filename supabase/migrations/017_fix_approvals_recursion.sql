/**
 * MIGRATION 017: Fix infinite recursion in documents and approval_steps RLS
 * This prevents the 'infinite recursion detected' error when querying approvals.
 */

-- 1. Remove old problematic policies
DROP POLICY IF EXISTS "Approvers can see documents assigned to them" ON public.documents;
DROP POLICY IF EXISTS "Document creators can view steps" ON public.approval_steps;
DROP POLICY IF EXISTS "Creator can see own documents" ON public.documents;

-- 2. Create security definer functions to break recursion
-- These functions run with bypass RLS privileges for the specific check

CREATE OR REPLACE FUNCTION public.check_is_document_approver(doc_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.approval_steps
    WHERE document_id = doc_id AND approver_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_is_document_creator(doc_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = doc_id AND creator_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-implement policies using the safety functions

-- DOCUMENTS Policies
CREATE POLICY "Documents viewable by creator and approvers" ON public.documents
FOR SELECT USING (
  creator_id = auth.uid() OR public.check_is_document_approver(id)
);

-- APPROVAL_STEPS Policies
CREATE POLICY "Steps viewable by approver and creator" ON public.approval_steps
FOR SELECT USING (
  approver_id = auth.uid() OR public.check_is_document_creator(document_id)
);

-- Ensure creators can still insert
DROP POLICY IF EXISTS "Creator can create documents" ON public.documents;
CREATE POLICY "Creator can create documents" ON public.documents
FOR INSERT WITH CHECK (creator_id = auth.uid());
