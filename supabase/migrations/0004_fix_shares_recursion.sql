-- Migration: 0004_fix_shares_recursion.sql
-- Fixes PostgreSQL error 42P17: "infinite recursion detected in policy for relation 'shares'"
-- Run this in your Supabase Dashboard -> SQL Editor:
-- https://supabase.com/dashboard/project/chotuwwjokczbwcscfmo/sql/new

-- ─── 1. Security Definer Helper for File Ownership ───────────────────────────
-- This function checks if auth.uid() owns the given file.
-- Because it is marked SECURITY DEFINER, it bypasses RLS on public.files,
-- preventing the circular query back to public.shares.
create or replace function public.user_owns_file(f_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.files
    where id = f_id and owner_id = auth.uid()
  );
$$;

-- ─── 2. Fix 'shares: owner can insert' Policy ────────────────────────────────
drop policy if exists "shares: owner can insert" on public.shares;

create policy "shares: owner can insert"
  on public.shares for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and public.user_owns_file(file_id)
  );
