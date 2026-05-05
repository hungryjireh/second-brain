-- One-time migration: scope existing entries/settings rows to a single user_id.
-- Usage in Supabase SQL Editor:
--   1) Replace the user id/email below with the owner you want.
--   2) Run this script once.

begin;

create table if not exists public.entries (
  id bigserial primary key,
  user_id text not null,
  raw_text text not null,
  category text not null,
  content text not null,
  priority integer not null default 0,
  remind_at bigint null,
  reminded boolean not null default false,
  created_at bigint not null default extract(epoch from now())::bigint
);
create index if not exists entries_user_id_created_at_idx on public.entries (user_id, created_at desc);

create table if not exists public.settings (
  user_id text not null,
  key text not null,
  primary key (user_id, key),
  value text not null
);

-- Set this to the user id/email that should own existing rows.
select set_config('app.migration_user_id', 'you@example.com', false);

do $$
declare
  v_user_id text := nullif(current_setting('app.migration_user_id', true), '');
begin
  if v_user_id is null then
    raise exception 'Missing app.migration_user_id. Set it before running migration.';
  end if;
end $$;

-- entries: add user_id, backfill, enforce not-null, add lookup index
alter table if exists public.entries
  add column if not exists user_id text;

update public.entries
set user_id = current_setting('app.migration_user_id')
where user_id is null;

alter table if exists public.entries
  alter column user_id set not null;

create index if not exists entries_user_id_created_at_idx
  on public.entries (user_id, created_at desc);

-- settings: add user_id, backfill, switch primary key from (key) to (user_id, key)
alter table if exists public.settings
  add column if not exists user_id text;

update public.settings
set user_id = current_setting('app.migration_user_id')
where user_id is null;

alter table if exists public.settings
  alter column user_id set not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'settings'
      and c.contype = 'p'
  ) then
    execute 'alter table public.settings drop constraint settings_pkey';
  end if;
end $$;

alter table public.settings
  add constraint settings_pkey primary key (user_id, key);

commit;
