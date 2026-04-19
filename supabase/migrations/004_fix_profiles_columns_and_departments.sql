/**
 * MIGRATION: Fix profiles columns, seed departments, and update user trigger
 * Added to resolve the issue where the trigger fails silently when creating a new user.
 */

-- 1. Add missing columns to the profiles table
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists department_id uuid references public.departments(id);
alter table public.profiles add column if not exists role text default 'employee' check (role in ('admin', 'manager', 'employee'));
alter table public.profiles add column if not exists is_active boolean default true;
alter table public.profiles add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null;
alter table public.profiles add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- 2. Seed basic departments if they don't exist
insert into public.departments (name)
values 
  ('الإدارة العامة'),
  ('الموارد البشرية'),
  ('المالية'),
  ('تكنولوجيا المعلومات'),
  ('التسويق'),
  ('المبيعات')
on conflict do nothing;

-- 3. Update the trigger function to safely handle the new columns and empty department_id
create or replace function public.handle_new_user()
returns trigger as $$
declare
  target_dept_id uuid;
begin
  -- Safe handling of department_id to prevent casting errors
  if (new.raw_user_meta_data->>'department_id') is not null and (new.raw_user_meta_data->>'department_id') != '' then
    begin
      target_dept_id := (new.raw_user_meta_data->>'department_id')::uuid;
    exception when others then
      target_dept_id := null;
    end;
  else
    target_dept_id := null;
  end if;

  -- Insert the linked row into the profiles table
  insert into public.profiles (
    id, 
    full_name, 
    avatar_url, 
    email, 
    department_id, 
    role,
    updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    target_dept_id,
    coalesce(new.raw_user_meta_data->>'role', 'employee'),
    now()
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    department_id = excluded.department_id,
    updated_at = now();
    
  return new;
end;
$$ language plpgsql security definer;
