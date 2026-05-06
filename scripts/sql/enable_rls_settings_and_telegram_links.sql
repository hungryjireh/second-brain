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
  created_at bigint not null default extract(epoch from now())::bigint
);

create index if not exists telegram_links_chat_id_idx on public.telegram_links (chat_id);

alter table if exists public.telegram_links enable row level security;

drop policy if exists "users_can_select_own_telegram_links" on public.telegram_links;
drop policy if exists "users_can_insert_own_telegram_links" on public.telegram_links;
drop policy if exists "users_can_update_own_telegram_links" on public.telegram_links;
drop policy if exists "bot_can_lookup_telegram_links" on public.telegram_links;

create policy "users_can_select_own_telegram_links"
on public.telegram_links
for select
to authenticated
using ((select auth.uid())::text = user_id);

create policy "users_can_insert_own_telegram_links"
on public.telegram_links
for insert
to authenticated
with check ((select auth.uid())::text = user_id);

create policy "users_can_update_own_telegram_links"
on public.telegram_links
for update
to authenticated
using ((select auth.uid())::text = user_id)
with check ((select auth.uid())::text = user_id);

-- Bot webhook is unauthenticated (anon), so allow read lookup by chat_id.
create policy "bot_can_lookup_telegram_links"
on public.telegram_links
for select
to anon
using (true);

commit;
