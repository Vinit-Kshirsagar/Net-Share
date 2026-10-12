-- NetShare — Initial database schema and RLS policies
-- Migration: 0001_initial_schema.sql
-- Apply in Supabase SQL editor or via `supabase db push`

-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ─── Tables ───────────────────────────────────────────────────────────────────

-- Folder hierarchy. parent_folder_id is nullable (null = root level).
create table public.folders (
  id                uuid        primary key default gen_random_uuid(),
  owner_id          uuid        not null references auth.users(id) on delete cascade,
  name              text        not null check (length(name) between 1 and 100),
  parent_folder_id  uuid        references public.folders(id) on delete cascade,
  created_at        timestamptz not null default now()
);

comment on table public.folders is 'Folder hierarchy. owner_id comes from auth.users; never trust client-supplied owner.';

-- File metadata. File bytes live in Supabase Storage, NOT in this table.
create table public.files (
  id               uuid        primary key default gen_random_uuid(),
  owner_id         uuid        not null references auth.users(id) on delete cascade,
  folder_id        uuid        references public.folders(id) on delete set null,
  name             text        not null check (length(name) between 1 and 255),
  storage_path     text        not null unique,
  mime_type        text,
  size_bytes       bigint      not null default 0 check (size_bytes >= 0),
  checksum_sha256  text        check (
    checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'
  ),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.files is 'File metadata only — bytes are stored in Supabase Storage. storage_path is the bucket object path.';

-- Revocable, expiring share grants.
-- token_hash is SHA-256 of the raw share token; raw token is never stored.
create table public.shares (
  id          uuid        primary key default gen_random_uuid(),
  file_id     uuid        not null references public.files(id) on delete cascade,
  owner_id    uuid        not null references auth.users(id) on delete cascade,
  token_hash  text        not null unique,
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);

comment on table public.shares is 'Store only the SHA-256 hash of the share token. Raw tokens are never persisted.';

-- Transfer telemetry. Records actual measured operations, not simulated values.
create table public.transfer_logs (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        references auth.users(id) on delete set null,
  request_id        uuid        not null unique,
  operation         text        not null check (operation in (
    'upload', 'download', 'delete', 'rename', 'share', 'tcp_test'
  )),
  status_code       integer,
  duration_ms       double precision check (duration_ms is null or duration_ms >= 0),
  bytes_transferred bigint      not null default 0 check (bytes_transferred >= 0),
  error_code        text,
  created_at        timestamptz not null default now()
);

comment on table public.transfer_logs is 'Client-reported telemetry. Values are client-measured application-level metrics, not raw TCP stats.';

-- Optional experiment records for the networking lab.
create table public.experiments (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  experiment_type  text        not null,
  parameters       jsonb       not null default '{}',
  results          jsonb       not null default '{}',
  created_at       timestamptz not null default now()
);

comment on table public.experiments is 'Saved experiment parameters and results from the networking lab.';

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index files_owner_created_idx       on public.files(owner_id, created_at desc);
create index files_owner_folder_idx        on public.files(owner_id, folder_id);
create index folders_owner_idx             on public.folders(owner_id);
create index folders_parent_idx            on public.folders(parent_folder_id);
create index shares_file_idx               on public.shares(file_id);
create index shares_token_hash_idx         on public.shares(token_hash);
create index transfer_logs_user_created_idx on public.transfer_logs(user_id, created_at desc);
create index experiments_user_idx          on public.experiments(user_id, created_at desc);

-- Auto-update updated_at on files
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger files_set_updated_at
  before update on public.files
  for each row execute function public.set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.folders       enable row level security;
alter table public.files         enable row level security;
alter table public.shares        enable row level security;
alter table public.transfer_logs enable row level security;
alter table public.experiments   enable row level security;

-- ── Folders ──────────────────────────────────────────────────────────────────

create policy "folders: owner can read"
  on public.folders for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "folders: owner can insert"
  on public.folders for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "folders: owner can update"
  on public.folders for update
  to authenticated
  using  (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "folders: owner can delete"
  on public.folders for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- ── Files ────────────────────────────────────────────────────────────────────

create policy "files: owner can read"
  on public.files for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "files: owner can insert"
  on public.files for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "files: owner can update"
  on public.files for update
  to authenticated
  using  (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "files: owner can delete"
  on public.files for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- ── Shares ───────────────────────────────────────────────────────────────────

create policy "shares: owner can read"
  on public.shares for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "shares: owner can insert"
  on public.shares for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.files f
      where f.id = file_id
        and f.owner_id = (select auth.uid())
    )
  );

create policy "shares: owner can update"
  on public.shares for update
  to authenticated
  using  (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "shares: owner can delete"
  on public.shares for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- ── Transfer Logs ─────────────────────────────────────────────────────────────

create policy "transfer_logs: user can read own"
  on public.transfer_logs for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "transfer_logs: user can insert own"
  on public.transfer_logs for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Users cannot update or delete telemetry (immutable audit trail)

-- ── Experiments ──────────────────────────────────────────────────────────────

create policy "experiments: user can read own"
  on public.experiments for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "experiments: user can insert own"
  on public.experiments for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "experiments: user can delete own"
  on public.experiments for delete
  to authenticated
  using (user_id = (select auth.uid()));
