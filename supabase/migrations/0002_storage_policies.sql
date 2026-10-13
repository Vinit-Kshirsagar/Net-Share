-- NetShare — Supabase Storage bucket & Row Level Security setup
-- Run this in the Supabase Dashboard -> SQL Editor
-- Migration: 0002_storage_policies.sql

-- ─── 1. Create 'netshare-files' Private Bucket ───────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'netshare-files',
  'netshare-files',
  false,
  104857600, -- 100 MB limit per file
  null       -- Allow all MIME types
)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ─── 2. Clean Up Any Pre-existing Policies ───────────────────────────────────
DROP POLICY IF EXISTS "netshare: owner can upload" ON storage.objects;
DROP POLICY IF EXISTS "netshare: owner can read" ON storage.objects;
DROP POLICY IF EXISTS "netshare: owner can update" ON storage.objects;
DROP POLICY IF EXISTS "netshare: owner can delete" ON storage.objects;

-- ─── 3. Storage Object RLS Policies ──────────────────────────────────────────
-- Namespace design: {user_id}/{file_uuid}-{filename}
-- Users can only operate on objects where the root folder matches their auth.uid().

-- Allow authenticated users to upload directly to their own folder
CREATE POLICY "netshare: owner can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'netshare-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read/download their own objects
CREATE POLICY "netshare: owner can read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'netshare-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update/replace their own objects
CREATE POLICY "netshare: owner can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'netshare-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own objects
CREATE POLICY "netshare: owner can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'netshare-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
