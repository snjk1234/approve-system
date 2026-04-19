/**
 * MIGRATION: Setup Supabase Storage Buckets and Policies
 * Creates buckets for avatars, documents, and chat attachments.
 */

-- 1. Create buckets (if they don't exist)
insert into storage.buckets (id, name, public) 
values 
  ('avatars', 'avatars', true),
  ('documents', 'documents', true),
  ('chat_attachments', 'chat_attachments', true)
on conflict (id) do nothing;

-- 2. Avatars Bucket Policies
create policy "Avatars are publicly accessible" on storage.objects for select using (bucket_id = 'avatars');
create policy "Anyone can upload an avatar" on storage.objects for insert with check (bucket_id = 'avatars');
create policy "Users can update their own avatar" on storage.objects for update using (auth.uid() = owner);

-- 3. Documents Bucket Policies
create policy "Documents are accessible by authenticated users" on storage.objects for select using (bucket_id = 'documents' and auth.role() = 'authenticated');
create policy "Authenticated users can upload documents" on storage.objects for insert with check (bucket_id = 'documents' and auth.role() = 'authenticated');

-- 4. Chat Attachments Bucket Policies
create policy "Chat attachments are accessible by authenticated users" on storage.objects for select using (bucket_id = 'chat_attachments' and auth.role() = 'authenticated');
create policy "Authenticated users can upload chat attachments" on storage.objects for insert with check (bucket_id = 'chat_attachments' and auth.role() = 'authenticated');
