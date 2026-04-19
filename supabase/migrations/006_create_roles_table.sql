/**
 * MIGRATION: Create roles table and link it to profiles
 */

-- 1. Create the roles table
create table if not exists public.roles (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.roles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Roles are viewable by everyone') then
    create policy "Roles are viewable by everyone" on public.roles for select using (true);
  end if;
end $$;

-- 2. Seed default roles
insert into public.roles (name)
values 
  ('موظف'),
  ('مدير'),
  ('نائب'),
  ('أخرى')
on conflict (name) do nothing;

-- 3. Modify the profiles table to use role_id instead of role text
-- First, drop the check constraint from migration 005 if it exists
DO $$ 
DECLARE 
    const_name text;
BEGIN
    FOR const_name IN 
        SELECT conname 
        FROM pg_constraint 
        JOIN pg_class ON conrelid = pg_class.oid 
        JOIN pg_attribute ON attnum = ANY(conkey) AND attrelid = pg_class.oid
        WHERE relname = 'profiles' AND attname = 'role'
    LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || const_name;
    END LOOP;
END $$;

-- Add role_id column and drop old role column
alter table public.profiles add column if not exists role_id uuid references public.roles(id);
alter table public.profiles drop column if exists role;

-- 4. Update the trigger function to use role_id
create or replace function public.handle_new_user()
returns trigger as $$
declare
  target_dept_id uuid;
  target_role_id uuid;
  default_role_id uuid;
begin
  -- Safe handling of department_id
  if (new.raw_user_meta_data->>'department_id') is not null and (new.raw_user_meta_data->>'department_id') != '' then
    begin
      target_dept_id := (new.raw_user_meta_data->>'department_id')::uuid;
    exception when others then
      target_dept_id := null;
    end;
  else
    target_dept_id := null;
  end if;

  -- Safe handling of role_id
  if (new.raw_user_meta_data->>'role_id') is not null and (new.raw_user_meta_data->>'role_id') != '' then
    begin
      target_role_id := (new.raw_user_meta_data->>'role_id')::uuid;
    exception when others then
      target_role_id := null;
    end;
  else
    target_role_id := null;
  end if;

  -- Fallback to default 'موظف' role if no role is selected or an error occurs
  if target_role_id is null then
    select id into default_role_id from public.roles where name = 'موظف' limit 1;
    target_role_id := default_role_id;
  end if;

  -- Insert into profiles
  insert into public.profiles (
    id, 
    full_name, 
    avatar_url, 
    email, 
    phone,
    department_id, 
    role_id,
    updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    new.raw_user_meta_data->>'phone',
    target_dept_id,
    target_role_id,
    now()
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    department_id = excluded.department_id,
    role_id = excluded.role_id,
    updated_at = now();
    
  return new;
end;
$$ language plpgsql security definer;
