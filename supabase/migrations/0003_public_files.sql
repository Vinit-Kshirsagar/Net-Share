-- Migration: 0003_public_files.sql
-- Adds is_public column to files, public file download policies, and a
-- dedicated public-files listing endpoint RLS policy.
-- Run in: https://supabase.com/dashboard/project/chotuwwjokczbwcscfmo/sql/new

-- ─── 1. Add is_public column ────────────────────────────────────────────────
alter table public.files
  add column if not exists is_public boolean not null default false;

-- ─── 2. RLS: Any authenticated user can read a public file's metadata ────────
drop policy if exists "files: authenticated can read public" on public.files;
create policy "files: authenticated can read public"
  on public.files for select
  to authenticated
  using (is_public = true);

-- ─── 3. RLS: Any authenticated user can read storage objects for public files
drop policy if exists "netshare: authenticated can read public file objects" on storage.objects;
create policy "netshare: authenticated can read public file objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'netshare-files'
    and exists (
      select 1 from public.files f
      where f.storage_path = storage.objects.name
        and f.is_public = true
    )
  );
