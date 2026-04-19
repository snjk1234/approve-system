/**
 * MIGRATION: Fix Departments RLS Policy
 * Allows anonymous users (like those on the signup page) to view the departments list.
 */

-- 1. Drop the old policy that restricted view to authenticated users only
drop policy if exists "Departments are viewable by all authenticated users" on public.departments;

-- 2. Create a new policy that allows everyone to select (read) from the departments table
create policy "Departments are viewable by everyone" on public.departments for select using (true);

-- 3. Ensure base departments exist
insert into public.departments (name)
values 
  ('الإدارة العامة'),
  ('الموارد البشرية'),
  ('المالية'),
  ('تكنولوجيا المعلومات'),
  ('التسويق'),
  ('المبيعات')
on conflict do nothing;
