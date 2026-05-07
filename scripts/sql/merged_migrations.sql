-- Consolidated SQL migrations for second-brain
-- This file merges all prior scripts under scripts/sql.
-- Sections are ordered by original file modification time (oldest -> newest).

-- ===== migrate_user_scope.sql =====
begin;

create table if not exists public.entries (
  id bigserial primary key,
  user_id text not null,
  raw_text text not null,
  summary text,
  title text,
  description text,
  category text not null,
  content text not null,
  priority integer not null default 0,
  remind_at bigint null,
  reminded boolean not null default false,
  is_archived boolean not null default false,
  is_deleted boolean not null default false,
  created_at bigint not null default extract(epoch from now())::bigint
);
create index if not exists entries_user_id_created_at_idx on public.entries (user_id, created_at desc);

create table if not exists public.settings (
  user_id text not null,
  key text not null,
  primary key (user_id, key),
  value text not null
);

select set_config('app.migration_user_id', 'you@example.com', false);

do $$
declare
  v_user_id text := nullif(current_setting('app.migration_user_id', true), '');
begin
  if v_user_id is null then
    raise exception 'Missing app.migration_user_id. Set it before running migration.';
  end if;
end $$;

update public.entries
set user_id = current_setting('app.migration_user_id')
where user_id is null;

alter table if exists public.entries
  alter column user_id set not null;

create index if not exists entries_user_id_created_at_idx
  on public.entries (user_id, created_at desc);

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

-- ===== enable_rls_entries.sql =====
begin;

select id, user_id
from public.entries
where user_id is not null
  and user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

drop policy if exists "users_can_insert_own_entries" on public.entries;
drop policy if exists "users_can_select_own_entries" on public.entries;
drop policy if exists "users_can_update_own_entries" on public.entries;

alter table public.entries
  alter column user_id type uuid using user_id::uuid;

alter table public.entries
  alter column user_id set not null;

alter table public.entries
  add constraint entries_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

create policy "users_can_insert_own_entries"
on public.entries
for insert
to authenticated
with check (user_id = auth.uid());

create policy "users_can_select_own_entries"
on public.entries
for select
to authenticated
using (user_id = auth.uid());

create policy "users_can_update_own_entries"
on public.entries
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

commit;

-- ===== add_is_archived_column.sql =====
begin;

create index if not exists entries_user_id_is_archived_created_at_idx
  on public.entries (user_id, is_archived, created_at desc);

commit;

-- ===== add_is_deleted_column.sql =====
begin;

create index if not exists entries_user_id_is_deleted_created_at_idx
  on public.entries (user_id, is_deleted, created_at desc);

commit;

-- ===== optimize_entries_listing_indexes.sql =====
begin;

-- Supports default list pagination:
-- where user_id = ? and is_deleted = false
-- order by created_at desc, id desc
create index if not exists entries_user_id_is_deleted_created_at_id_idx
  on public.entries (user_id, is_deleted, created_at desc, id desc);

-- Supports category-scoped pagination:
-- where user_id = ? and is_deleted = false and category = ?
-- order by created_at desc, id desc
create index if not exists entries_user_id_is_deleted_category_created_at_id_idx
  on public.entries (user_id, is_deleted, category, created_at desc, id desc);

commit;

-- ===== optimize_entries_active_partial_indexes.sql =====
begin;

-- Smaller, faster index for active-entry pagination:
-- where user_id = ? and is_deleted = false
-- order by created_at desc, id desc
create index if not exists entries_active_user_created_at_id_idx
  on public.entries (user_id, created_at desc, id desc)
  where is_deleted = false;

-- Smaller, faster index for active-entry category pagination:
-- where user_id = ? and is_deleted = false and category = ?
-- order by created_at desc, id desc
create index if not exists entries_active_user_category_created_at_id_idx
  on public.entries (user_id, category, created_at desc, id desc)
  where is_deleted = false;

commit;

-- ===== add_tags_tables.sql =====
begin;

create table if not exists public.tags (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  created_at bigint not null default extract(epoch from now())::bigint,
  updated_at bigint not null default extract(epoch from now())::bigint,
  constraint tags_user_id_normalized_name_key unique (user_id, normalized_name)
);

create table if not exists public.entry_tags (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id bigint not null references public.entries(id) on delete cascade,
  tag_id bigint not null references public.tags(id) on delete cascade,
  created_at bigint not null default extract(epoch from now())::bigint,
  primary key (entry_id, tag_id)
);

create index if not exists tags_user_id_name_idx
  on public.tags (user_id, name);

create index if not exists entry_tags_user_id_entry_id_idx
  on public.entry_tags (user_id, entry_id);

create index if not exists entry_tags_user_id_tag_id_idx
  on public.entry_tags (user_id, tag_id);

alter table public.tags enable row level security;
alter table public.entry_tags enable row level security;

drop policy if exists "users_can_insert_own_tags" on public.tags;
drop policy if exists "users_can_select_own_tags" on public.tags;
drop policy if exists "users_can_update_own_tags" on public.tags;
drop policy if exists "users_can_delete_own_tags" on public.tags;

create policy "users_can_insert_own_tags"
on public.tags
for insert
to authenticated
with check (user_id = auth.uid());

create policy "users_can_select_own_tags"
on public.tags
for select
to authenticated
using (user_id = auth.uid());

create policy "users_can_update_own_tags"
on public.tags
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users_can_delete_own_tags"
on public.tags
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "users_can_insert_own_entry_tags" on public.entry_tags;
drop policy if exists "users_can_select_own_entry_tags" on public.entry_tags;
drop policy if exists "users_can_delete_own_entry_tags" on public.entry_tags;

create policy "users_can_insert_own_entry_tags"
on public.entry_tags
for insert
to authenticated
with check (user_id = auth.uid());

create policy "users_can_select_own_entry_tags"
on public.entry_tags
for select
to authenticated
using (user_id = auth.uid());

create policy "users_can_delete_own_entry_tags"
on public.entry_tags
for delete
to authenticated
using (user_id = auth.uid());

commit;

-- ===== add_max_10_tags_per_user_constraint.sql =====
begin;

create or replace function public.enforce_max_tags_per_user()
returns trigger
language plpgsql
as $$
declare
  existing_count integer;
begin
  select count(*)
    into existing_count
  from public.tags
  where user_id = new.user_id;

  if existing_count >= 10 then
    raise exception 'A maximum of 10 tags is allowed per user';
  end if;

  return new;
end;
$$;

drop trigger if exists tags_max_10_per_user on public.tags;

create trigger tags_max_10_per_user
before insert on public.tags
for each row
execute function public.enforce_max_tags_per_user();

commit;

-- ===== enable_rls_settings_and_telegram_links.sql =====
begin;

alter table if exists public.settings enable row level security;

drop policy if exists "users_can_select_own_settings" on public.settings;
drop policy if exists "users_can_insert_own_settings" on public.settings;
drop policy if exists "users_can_update_own_settings" on public.settings;

create policy "users_can_select_own_settings"
on public.settings
for select
to authenticated
using ((select auth.uid())::text = user_id);

create policy "users_can_insert_own_settings"
on public.settings
for insert
to authenticated
with check ((select auth.uid())::text = user_id);

create policy "users_can_update_own_settings"
on public.settings
for update
to authenticated
using ((select auth.uid())::text = user_id)
with check ((select auth.uid())::text = user_id);

create table if not exists public.telegram_links (
  user_id text primary key,
  chat_id text not null unique,
  auth_token text,
  created_at bigint not null default extract(epoch from now())::bigint
);

create index if not exists telegram_links_chat_id_idx on public.telegram_links (chat_id);
alter table if exists public.telegram_links add column if not exists auth_token text;

alter table if exists public.telegram_links enable row level security;

drop policy if exists "users_can_select_own_telegram_links" on public.telegram_links;
drop policy if exists "users_can_insert_own_telegram_links" on public.telegram_links;
drop policy if exists "users_can_update_own_telegram_links" on public.telegram_links;
drop policy if exists "bot_can_lookup_telegram_links" on public.telegram_links;

create policy "users_can_select_own_telegram_links"
on public.telegram_links
for select
to authenticated
using (
  (select auth.uid())::text = user_id
  and length(trim(chat_id)) > 0
);

create policy "users_can_insert_own_telegram_links"
on public.telegram_links
for insert
to authenticated
with check (
  (select auth.uid())::text = user_id
  and length(trim(chat_id)) > 0
);

create policy "users_can_update_own_telegram_links"
on public.telegram_links
for update
to authenticated
using (
  (select auth.uid())::text = user_id
  and length(trim(chat_id)) > 0
)
with check (
  (select auth.uid())::text = user_id
  and length(trim(chat_id)) > 0
);

drop function if exists public.lookup_telegram_link_by_chat_id(text);
create function public.lookup_telegram_link_by_chat_id(p_chat_id text)
returns table (user_id text, auth_token text)
language sql
security definer
set search_path = public
as $$
  select tl.user_id, tl.auth_token
  from public.telegram_links tl
  where tl.chat_id = p_chat_id
    and length(trim(p_chat_id)) > 0
  limit 1;
$$;

revoke all on function public.lookup_telegram_link_by_chat_id(text) from public;
grant execute on function public.lookup_telegram_link_by_chat_id(text) to anon;
grant execute on function public.lookup_telegram_link_by_chat_id(text) to authenticated;

commit;
