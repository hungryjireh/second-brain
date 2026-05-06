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
