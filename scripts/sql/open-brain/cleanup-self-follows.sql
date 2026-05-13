-- One-time maintenance: remove legacy self-follow rows and enforce constraint.
-- Run in Supabase SQL Editor.

begin;

delete from public.follows
where follower_id = following_id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.follows'::regclass
      and conname = 'follows_no_self_follow'
  ) then
    alter table public.follows
      add constraint follows_no_self_follow
      check (follower_id <> following_id) not valid;
  end if;
end
$$;

alter table public.follows
  validate constraint follows_no_self_follow;

commit;
