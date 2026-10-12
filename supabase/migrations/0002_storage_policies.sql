-- NetShare — Supabase Storage bucket policy setup
-- Run after creating the 'netshare-files' private bucket in the Supabase dashboard.
-- Migration: 0002_storage_policies.sql

-- ─── Storage bucket policies ─────────────────────────────────────────────────
-- The bucket 'netshare-files' MUST be created as PRIVATE in the Supabase
-- Storage dashboard before applying these policies.
--
-- Policy design:
--   - Objects are stored at path: {user_id}/{file_uuid}
--   - Users can only operate on objects under their own {user_id}/ prefix
--   - No public access; all downloads require authenticated session or signed URL

-- Allow authenticated users to upload to their own namespace
insert into storage.policies (name, bucket_id, operation, definition)
values (
  'netshare: owner can upload',
  'netshare-files',
  'INSERT',
  'auth.uid()::text = (storage.foldername(name))[1]'
);

-- Allow authenticated users to read/download their own objects
insert into storage.policies (name, bucket_id, operation, definition)
values (
  'netshare: owner can read',
  'netshare-files',
  'SELECT',
  'auth.uid()::text = (storage.foldername(name))[1]'
);

-- Allow authenticated users to update (replace) their own objects
insert into storage.policies (name, bucket_id, operation, definition)
values (
  'netshare: owner can update',
  'netshare-files',
  'UPDATE',
  'auth.uid()::text = (storage.foldername(name))[1]'
);

-- Allow authenticated users to delete their own objects
insert into storage.policies (name, bucket_id, operation, definition)
values (
  'netshare: owner can delete',
  'netshare-files',
  'DELETE',
  'auth.uid()::text = (storage.foldername(name))[1]'
);
