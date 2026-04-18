/**
 * DEPARTMENTS
 */
create table departments (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table departments enable row level security;
create policy "Departments are viewable by all authenticated users" on departments
  for select using (auth.role() = 'authenticated');

/**
 * USERS
 * Extended with department, role, phone for the enterprise chat system.
 */
create table users (
  id uuid references auth.users not null primary key,
  full_name text,
  avatar_url text,
  email text,
  phone text,
  department_id uuid references departments(id),
  role text default 'employee' check (role in ('admin', 'manager', 'employee')),
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table users enable row level security;
create policy "Users can view all users" on users for select using (auth.role() = 'authenticated');
create policy "Users can update own data" on users for update using (auth.uid() = id);

/**
 * Trigger: auto-create user row on sign-up
 */
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, full_name, avatar_url, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- CHAT & MESSAGING
-- ============================================================

/**
 * CHATS (direct message conversations)
 */
create table chats (
  id uuid default gen_random_uuid() primary key,
  created_by uuid references users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table chats enable row level security;

/**
 * CHAT_PARTICIPANTS (who is in each chat)
 */
create table chat_participants (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references chats(id) on delete cascade not null,
  user_id uuid references users(id) not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(chat_id, user_id)
);
alter table chat_participants enable row level security;
create policy "Users can see chats they belong to" on chat_participants
  for select using (user_id = auth.uid());
create policy "Users can see their chats" on chats
  for select using (
    exists (
      select 1 from chat_participants
      where chat_participants.chat_id = chats.id
      and chat_participants.user_id = auth.uid()
    )
  );

/**
 * MESSAGES
 */
create table messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references chats(id) on delete cascade not null,
  sender_id uuid references users(id) not null,
  content text,
  file_url text,
  file_name text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table messages enable row level security;
create policy "Users can see messages in their chats" on messages
  for select using (
    exists (
      select 1 from chat_participants
      where chat_participants.chat_id = messages.chat_id
      and chat_participants.user_id = auth.uid()
    )
  );
create policy "Users can send messages to their chats" on messages
  for insert with check (
    sender_id = auth.uid() and
    exists (
      select 1 from chat_participants
      where chat_participants.chat_id = messages.chat_id
      and chat_participants.user_id = auth.uid()
    )
  );

-- ============================================================
-- APPROVAL WORKFLOW
-- ============================================================

/**
 * Document status enum
 */
create type document_status as enum ('pending', 'in_progress', 'paused', 'completed', 'cancelled');
create type step_status as enum ('waiting', 'pending', 'approved', 'rejected');
create type memo_status as enum ('open', 'resolved', 'cancelled');

/**
 * DOCUMENTS / APPROVAL REQUESTS
 */
create table documents (
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
alter table documents enable row level security;
create policy "Creator can see own documents" on documents
  for select using (creator_id = auth.uid());
create policy "Approvers can see documents assigned to them" on documents
  for select using (
    exists (
      select 1 from approval_steps
      where approval_steps.document_id = documents.id
      and approval_steps.approver_id = auth.uid()
    )
  );
create policy "Creator can create documents" on documents
  for insert with check (creator_id = auth.uid());

/**
 * APPROVAL STEPS (sequential approvers)
 */
create table approval_steps (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references documents(id) on delete cascade not null,
  approver_id uuid references users(id) not null,
  sequence integer not null,
  status step_status default 'waiting' not null,
  comment text,
  acted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table approval_steps enable row level security;
create policy "Approvers can view their steps" on approval_steps
  for select using (approver_id = auth.uid());
create policy "Document creators can view steps" on approval_steps
  for select using (
    exists (
      select 1 from documents
      where documents.id = approval_steps.document_id
      and documents.creator_id = auth.uid()
    )
  );

/**
 * DISCUSSION MEMOS (opened on rejection)
 */
create table discussion_memos (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references documents(id) on delete cascade not null,
  objector_id uuid references users(id) not null,
  creator_id uuid references users(id) not null,
  status memo_status default 'open' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved_at timestamp with time zone
);
alter table discussion_memos enable row level security;
create policy "Memo participants can view memos" on discussion_memos
  for select using (objector_id = auth.uid() or creator_id = auth.uid());

/**
 * MEMO MESSAGES
 */
create table memo_messages (
  id uuid default gen_random_uuid() primary key,
  memo_id uuid references discussion_memos(id) on delete cascade not null,
  sender_id uuid references users(id) not null,
  content text,
  file_url text,
  file_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table memo_messages enable row level security;
create policy "Memo participants can view memo messages" on memo_messages
  for select using (
    exists (
      select 1 from discussion_memos
      where discussion_memos.id = memo_messages.memo_id
      and (discussion_memos.objector_id = auth.uid() or discussion_memos.creator_id = auth.uid())
    )
  );
create policy "Memo participants can send memo messages" on memo_messages
  for insert with check (
    sender_id = auth.uid() and
    exists (
      select 1 from discussion_memos
      where discussion_memos.id = memo_messages.memo_id
      and (discussion_memos.objector_id = auth.uid() or discussion_memos.creator_id = auth.uid())
    )
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

/**
 * NOTIFICATIONS
 */
create table notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) not null,
  type text not null check (type in ('approval_request', 'approved', 'rejected', 'memo', 'completed', 'message')),
  title text not null,
  body text,
  link text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table notifications enable row level security;
create policy "Users can see their own notifications" on notifications
  for select using (user_id = auth.uid());
create policy "Users can update their own notifications" on notifications
  for update using (user_id = auth.uid());

-- ============================================================
-- REALTIME
-- ============================================================

drop publication if exists supabase_realtime;
create publication supabase_realtime for table messages, notifications, approval_steps, memo_messages;
