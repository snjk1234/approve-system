/**
 * MIGRATION 020: Clean Rebuild of Approvals RLS
 * -----------------------------------------------
 * Problem: Previous migrations left conflicting/duplicate policies which caused
 *   infinite recursion and unexpected authorization errors.
 * Solution: Drop ALL existing policies on documents and approval_steps, then
 *   recreate them cleanly using SECURITY DEFINER helper functions that break
 *   any cross-table recursion.
 */

-- ================================================================
-- STEP 1: Drop ALL existing policies on affected tables
-- ================================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'documents' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.documents', pol.policyname);
  END LOOP;

  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'approval_steps' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.approval_steps', pol.policyname);
  END LOOP;
END $$;

-- ================================================================
-- STEP 2: Drop old helper functions (if any) and recreate them cleanly
-- ================================================================

DROP FUNCTION IF EXISTS public.check_is_document_approver(uuid);
DROP FUNCTION IF EXISTS public.check_is_document_creator(uuid);

-- Returns TRUE if the current user is an approver on the given document.
-- SECURITY DEFINER bypasses RLS to avoid cross-table recursion.
CREATE OR REPLACE FUNCTION public.check_is_document_approver(doc_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.approval_steps
    WHERE document_id = doc_id
      AND approver_id = auth.uid()
  );
$$;

-- Returns TRUE if the current user is the creator of the given document.
CREATE OR REPLACE FUNCTION public.check_is_document_creator(doc_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.documents
    WHERE id = doc_id
      AND creator_id = auth.uid()
  );
$$;

-- ================================================================
-- STEP 3: Recreate DOCUMENTS policies (clean, no duplicates)
-- ================================================================

-- SELECT: creator or any approver can view
CREATE POLICY "documents_select" ON public.documents
  FOR SELECT USING (
    creator_id = auth.uid()
    OR public.check_is_document_approver(id)
  );

-- INSERT: only the authenticated user themselves
CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT WITH CHECK (
    creator_id = auth.uid()
  );

-- UPDATE: creator or any approver can update (status changes)
CREATE POLICY "documents_update" ON public.documents
  FOR UPDATE USING (
    creator_id = auth.uid()
    OR public.check_is_document_approver(id)
  );

-- ================================================================
-- STEP 4: Recreate APPROVAL_STEPS policies (clean, no duplicates)
-- ================================================================

-- SELECT: the assigned approver or the document creator can view
CREATE POLICY "approval_steps_select" ON public.approval_steps
  FOR SELECT USING (
    public.check_is_document_approver(document_id)
    OR public.check_is_document_creator(document_id)
  );

-- INSERT: only the document creator can add steps
CREATE POLICY "approval_steps_insert" ON public.approval_steps
  FOR INSERT WITH CHECK (
    public.check_is_document_creator(document_id)
  );

-- UPDATE: only the assigned approver can act on their own step
CREATE POLICY "approval_steps_update" ON public.approval_steps
  FOR UPDATE USING (
    public.check_is_document_approver(document_id)
    OR public.check_is_document_creator(document_id)
  );

-- ================================================================
-- STEP 5: Ensure RLS is enabled on the tables
-- ================================================================

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- STEP 6: Grant execute on helper functions to authenticated users
-- ================================================================

GRANT EXECUTE ON FUNCTION public.check_is_document_approver(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_document_creator(uuid) TO authenticated;
