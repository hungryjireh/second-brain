-- 0) Optional: wrap in a transaction for safety
begin;

-- 1) Check for invalid UUID strings (must be zero rows before conversion)
select id, user_id
from public.entries
where user_id is not null
  and user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

-- If rows appear, fix or delete them first, then re-run step 1.

-- 2) Drop policies that reference user_id (adjust names if different)
drop policy if exists "users_can_insert_own_entries" on public.entries;
drop policy if exists "users_can_select_own_entries" on public.entries;
drop policy if exists "users_can_update_own_entries" on public.entries;

-- 3) Convert column type from text -> uuid
alter table public.entries
  alter column user_id type uuid using user_id::uuid;

-- 4) (Recommended) ensure nulls are not allowed
alter table public.entries
  alter column user_id set not null;

-- 5) (Recommended) add FK to auth.users(id)
alter table public.entries
  add constraint entries_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- 6) Recreate RLS policies with uuid-safe comparison
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
