/**
 * MIGRATION: Update roles constraint and trigger to handle phone and arabic roles
 */

-- 1. Drop existing check constraints on the role column safely
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

-- 2. Add the new check constraint for roles including Arabic options
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('موظف', 'مدير', 'نائب', 'أخرى', 'admin', 'manager', 'employee'));

-- 3. Update the trigger function to insert phone and role properly
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

  -- Insert the linked row into the profiles table including phone and role
  insert into public.profiles (
    id, 
    full_name, 
    avatar_url, 
    email, 
    phone,
    department_id, 
    role,
    updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    new.raw_user_meta_data->>'phone',
    target_dept_id,
    coalesce(new.raw_user_meta_data->>'role', 'موظف'),
    now()
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    department_id = excluded.department_id,
    role = excluded.role,
    updated_at = now();
    
  return new;
end;
$$ language plpgsql security definer;
