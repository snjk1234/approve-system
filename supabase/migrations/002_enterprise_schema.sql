/**
 * MIGRATION: Enterprise Chat & Approval Workflow
 * Added: 2024-04-19
 */

-- Enable required extensions
create extension if not exists "uuid-ossp";

/**
 * DEPARTMENTS
 */
create table if not exists public.departments (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Basic departments seed
insert into public.departments (name)
values 
  ('الإدارة العامة'),
  ('الموارد البشرية'),
  ('المالية'),
  ('تكنولوجيا المعلومات'),
  ('التسويق'),
  ('المبيعات')
on conflict do nothing;

alter table public.departments enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Departments are viewable by all authenticated users') then
    create policy "Departments are viewable by all authenticated users" on departments
      for select using (auth.role() = 'authenticated');
  end if;
end $$;

/**
 * USERS (Base + Extended Profile)
 */
-- Create the table if it doesn't exist (e.g. fresh installation)
create table if not exists public.users (
  id uuid references auth.users not null primary key,
  full_name text,
  avatar_url text,
  billing_address jsonb,
  payment_method jsonb
);

-- Ensure the users table has the new columns
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='users' and column_name='email') then
    alter table public.users add column email text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='users' and column_name='phone') then
    alter table public.users add column phone text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='users' and column_name='department_id') then
    alter table public.users add column department_id uuid references departments(id);
  end if;
  if not exists (select 1 from information_schema.columns where table_name='users' and column_name='role') then
    alter table public.users add column role text default 'employee' check (role in ('admin', 'manager', 'employee'));
  end if;
  if not exists (select 1 from information_schema.columns where table_name='users' and column_name='is_active') then
    alter table public.users add column is_active boolean default true;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='users' and column_name='created_at') then
    alter table public.users add column created_at timestamp with time zone default timezone('utc'::text, now()) not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='users' and column_name='updated_at') then
    alter table public.users add column updated_at timestamp with time zone default timezone('utc'::text, now()) not null;
  end if;
end $$;

alter table public.users enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view all users') then
    create policy "Users can view all users" on users for select using (auth.role() = 'authenticated');
  end if;
end $$;

/**
 * Updated trigger for new user (handling metadata)
 */
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, full_name, avatar_url, email, department_id)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    case 
      when new.raw_user_meta_data->>'department_id' = '' then null 
      else (new.raw_user_meta_data->>'department_id')::uuid 
    end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger should already exist as on_auth_user_created, but let's ensure it exists
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  end if;
end $$;


-- ============================================================
-- CHAT & MESSAGING
-- ============================================================

create table if not exists public.chats (
  id uuid default gen_random_uuid() primary key,
  created_by uuid references users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.chat_participants (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references chats(id) on delete cascade not null,
  user_id uuid references users(id) not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(chat_id, user_id)
);

create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references chats(id) on delete cascade not null,
  sender_id uuid references users(id) not null,
  content text,
  file_url text,
  file_name text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;

-- Policies for chats
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can see chats they belong to') then
    create policy "Users can see chats they belong to" on chat_participants
      for select using (user_id = auth.uid());
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Users can see their chats') then
    create policy "Users can see their chats" on chats
      for select using (
        exists (
          select 1 from chat_participants
          where chat_participants.chat_id = chats.id
          and chat_participants.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can see messages in their chats') then
    create policy "Users can see messages in their chats" on messages
      for select using (
        exists (
          select 1 from chat_participants
          where chat_participants.chat_id = messages.chat_id
          and chat_participants.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can send messages to their chats') then
    create policy "Users can send messages to their chats" on messages
      for insert with check (
        sender_id = auth.uid() and
        exists (
          select 1 from chat_participants
          where chat_participants.chat_id = messages.chat_id
          and chat_participants.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- ============================================================
-- APPROVAL WORKFLOW
-- ============================================================

-- Types
do $$ begin
  if not exists (select 1 from pg_type where typname = 'document_status') then
    create type document_status as enum ('pending', 'in_progress', 'paused', 'completed', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'step_status') then
    create type step_status as enum ('waiting', 'pending', 'approved', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'memo_status') then
    create type memo_status as enum ('open', 'resolved', 'cancelled');
  end if;
end $$;

-- Tables
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  request_number serial,
  title text not null,
  description text,
  creator_id uuid references users(id) not null,
  file_url text,
  file_name text,
  status document_status default 'pending' not null,
  is_archived boolean default false,
  archived_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.approval_steps (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references documents(id) on delete cascade not null,
  approver_id uuid references users(id) not null,
  sequence integer not null,
  status step_status default 'waiting' not null,
  comment text,
  acted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.discussion_memos (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references documents(id) on delete cascade not null,
  objector_id uuid references users(id) not null,
  creator_id uuid references users(id) not null,
  status memo_status default 'open' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved_at timestamp with time zone
);

create table if not exists public.memo_messages (
  id uuid default gen_random_uuid() primary key,
  memo_id uuid references discussion_memos(id) on delete cascade not null,
  sender_id uuid references users(id) not null,
  content text,
  file_url text,
  file_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.documents enable row level security;
alter table public.approval_steps enable row level security;
alter table public.discussion_memos enable row level security;
alter table public.memo_messages enable row level security;

-- Policies for approvals
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Creator can see own documents') then
    create policy "Creator can see own documents" on documents for select using (creator_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Approvers can see documents assigned to them') then
    create policy "Approvers can see documents assigned to them" on documents
      for select using (
        exists (
          select 1 from approval_steps
          where approval_steps.document_id = documents.id
          and approval_steps.approver_id = auth.uid()
        )
      );
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Creator can create documents') then
    create policy "Creator can create documents" on documents for insert with check (creator_id = auth.uid());
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Approvers can view their steps') then
    create policy "Approvers can view their steps" on approval_steps for select using (approver_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Document creators can view steps') then
    create policy "Document creators can view steps" on approval_steps
      for select using (
        exists (
          select 1 from documents
          where documents.id = approval_steps.document_id
          and documents.creator_id = auth.uid()
        )
      );
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Memo participants can view memos') then
    create policy "Memo participants can view memos" on discussion_memos
      for select using (objector_id = auth.uid() or creator_id = auth.uid());
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Memo participants can view memo messages') then
    create policy "Memo participants can view memo messages" on memo_messages
      for select using (
        exists (
          select 1 from discussion_memos
          where discussion_memos.id = memo_messages.memo_id
          and (discussion_memos.objector_id = auth.uid() or discussion_memos.creator_id = auth.uid())
        )
      );
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Memo participants can send memo messages') then
    create policy "Memo participants can send memo messages" on memo_messages
      for insert with check (
        sender_id = auth.uid() and
        exists (
          select 1 from discussion_memos
          where discussion_memos.id = memo_messages.memo_id
          and (discussion_memos.objector_id = auth.uid() or discussion_memos.creator_id = auth.uid())
        )
      );
  end if;
end $$;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) not null,
  type text not null check (type in ('approval_request', 'approved', 'rejected', 'memo', 'completed', 'message')),
  title text not null,
  body text,
  link text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can see their own notifications') then
    create policy "Users can see their own notifications" on notifications for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update their own notifications') then
    create policy "Users can update their own notifications" on notifications for update using (user_id = auth.uid());
  end if;
end $$;

-- ============================================================
-- REALTIME
-- ============================================================

drop publication if exists supabase_realtime;
create publication supabase_realtime for table messages, notifications, approval_steps, memo_messages;
