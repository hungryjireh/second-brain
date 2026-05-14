-- Daily Thought App data model (Supabase/Postgres)
-- Run in Supabase SQL Editor

begin;

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- 1) Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  username_changed_once boolean not null default false,
  bio text,
  avatar_url text,
  streak_count int not null default 0,
  last_posted_at timestamptz,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists username_changed_once boolean not null default false;

alter table public.profiles
add column if not exists bio text;

-- Keep updated_at fresh on profile updates
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 2) Thoughts (immutable)
create table if not exists public.thoughts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  share_slug text unique,
  check (
    (visibility = 'public' and share_slug is not null)
    or
    (visibility = 'private' and share_slug is null)
  ),
  created_at timestamptz not null default now()
);

-- 3) Follows
create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- 4) Reactions
create table if not exists public.reactions (
  thought_id uuid not null references public.thoughts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('felt_this', 'me_too', 'made_me_think')),
  created_at timestamptz not null default now(),
  primary key (thought_id, user_id, type)
);

-- 5) Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('follow')),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_id <> actor_id)
);

-- 6) Per-user thought saves to SecondBrain
create table if not exists public.thought_second_brain_saves (
  thought_id uuid not null references public.thoughts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (thought_id, user_id)
);

-- Helpful indexes
create index if not exists idx_thoughts_created_at on public.thoughts (created_at desc);
create index if not exists idx_thoughts_user_id_created_at on public.thoughts (user_id, created_at desc);
create index if not exists idx_thoughts_share_slug on public.thoughts (share_slug) where share_slug is not null;
create index if not exists idx_follows_following_id on public.follows (following_id);
create index if not exists idx_reactions_thought_id on public.reactions (thought_id);
create index if not exists idx_reactions_user_id on public.reactions (user_id);
create index if not exists idx_notifications_user_id_created_at on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_actor_id on public.notifications (actor_id);
create index if not exists idx_thought_second_brain_saves_user_id on public.thought_second_brain_saves (user_id);

-- Auto-create profile when auth user is created
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'preferred_username',''),
      nullif(new.raw_user_meta_data->>'user_name',''),
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Optional: backfill profiles for existing auth users
insert into public.profiles (id, username, avatar_url)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data->>'preferred_username',''),
    nullif(u.raw_user_meta_data->>'user_name',''),
    split_part(u.email, '@', 1)
  ) as username,
  u.raw_user_meta_data->>'avatar_url' as avatar_url
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- RLS
alter table public.profiles enable row level security;
alter table public.thoughts enable row level security;
alter table public.follows enable row level security;
alter table public.reactions enable row level security;
alter table public.notifications enable row level security;
alter table public.thought_second_brain_saves enable row level security;

-- profiles: anyone can read, user can update only own profile
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
on public.profiles for select
using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- thoughts: anyone can read, user can insert own only, no update/delete
drop policy if exists "thoughts_select_public_or_own" on public.thoughts;
drop policy if exists "thoughts_select_all" on public.thoughts;
create policy "thoughts_select_public_or_own"
on public.thoughts for select
using (visibility = 'public' or auth.uid() = user_id);

drop policy if exists "thoughts_insert_own" on public.thoughts;
create policy "thoughts_insert_own"
on public.thoughts for insert
with check (auth.uid() = user_id);

-- follows: users manage their own follower rows
drop policy if exists "follows_select_all" on public.follows;
create policy "follows_select_all"
on public.follows for select
using (true);

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own"
on public.follows for insert
with check (auth.uid() = follower_id);

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own"
on public.follows for delete
using (auth.uid() = follower_id);

-- reactions: users manage their own reactions
drop policy if exists "reactions_select_all" on public.reactions;
create policy "reactions_select_all"
on public.reactions for select
using (true);

drop policy if exists "reactions_insert_own" on public.reactions;
create policy "reactions_insert_own"
on public.reactions for insert
with check (auth.uid() = user_id);

drop policy if exists "reactions_delete_own" on public.reactions;
create policy "reactions_delete_own"
on public.reactions for delete
using (auth.uid() = user_id);

-- notifications: anyone can read their own notifications, users can create events caused by themselves
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications for select
using (auth.uid() = user_id);

drop policy if exists "notifications_insert_actor" on public.notifications;
create policy "notifications_insert_actor"
on public.notifications for insert
with check (auth.uid() = actor_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- thought_second_brain_saves: users can read and create only their own save rows
drop policy if exists "thought_second_brain_saves_select_own" on public.thought_second_brain_saves;
create policy "thought_second_brain_saves_select_own"
on public.thought_second_brain_saves for select
using (auth.uid() = user_id);

drop policy if exists "thought_second_brain_saves_insert_own" on public.thought_second_brain_saves;
create policy "thought_second_brain_saves_insert_own"
on public.thought_second_brain_saves for insert
with check (auth.uid() = user_id);

commit;
