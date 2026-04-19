/**
 * MIGRATION: Rename users to profiles & Update Trigger
 */

-- 1. Rename table
alter table if exists public.users rename to profiles;

-- 2. Update RLS policies
drop policy if exists "Users can view all users" on profiles;
drop policy if exists "Users can update own data" on profiles;

create policy "Profiles are viewable by all authenticated users" on profiles for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- 3. Robust Trigger Function
create or replace function public.handle_new_user()
returns trigger as $$
declare
  target_dept_id uuid;
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
exception
  when others then
    return new;
end;
$$ language plpgsql security definer;

-- 4. Re-sync Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
