/**
 * MIGRATION: Add Admin RLS Policies for global view access
 */

-- Allow admins to view all documents
CREATE POLICY "admin_documents_select" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow admins to view all approval steps
CREATE POLICY "admin_approval_steps_select" ON public.approval_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow admins to view all profiles (if not already public)
CREATE POLICY "admin_profiles_select" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
