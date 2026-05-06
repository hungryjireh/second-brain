alter table if exists public.entries
  add column if not exists is_deleted boolean not null default false;

create index if not exists entries_user_id_is_deleted_created_at_idx
  on public.entries (user_id, is_deleted, created_at desc);
