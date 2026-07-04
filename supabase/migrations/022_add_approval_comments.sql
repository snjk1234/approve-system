-- Create approval_comments table
create table if not exists public.approval_comments (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references public.documents(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  action text not null,
  comment text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.approval_comments enable row level security;

-- Policies
create policy "Users can view comments for documents they can see" on public.approval_comments
  for select using (
    exists (
      select 1 from public.documents d
      where d.id = approval_comments.document_id
    )
  );

create policy "Users can insert comments for documents" on public.approval_comments
  for insert with check (
    auth.uid() = user_id
  );

-- Add to realtime publication
alter publication supabase_realtime add table public.approval_comments;
