-- Enable RLS and policies for settings + telegram links (no service-role key required).

begin;

-- settings table policies (per-user access)
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

-- table dedicated to Telegram account linkage
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

-- Restrict anon access to a minimal RPC surface instead of table scans.
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
