alter table if exists public.entries
  add column if not exists is_archived boolean not null default false;

create index if not exists entries_user_id_is_archived_created_at_idx
  on public.entries (user_id, is_archived, created_at desc);

commit;