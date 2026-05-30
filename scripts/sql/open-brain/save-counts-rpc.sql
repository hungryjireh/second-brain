begin;

create or replace function public.open_brain_save_counts(
  profile_ids uuid[] default '{}',
  thought_ids uuid[] default '{}'
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with
  normalized_profiles as (
    select distinct unnest(coalesce(profile_ids, '{}'::uuid[])) as profile_id
  ),
  normalized_thoughts as (
    select distinct unnest(coalesce(thought_ids, '{}'::uuid[])) as thought_id
  ),
  profile_counts as (
    select
      t.user_id as profile_id,
      count(s.thought_id)::bigint as save_count
    from public.thoughts t
    left join public.thought_second_brain_saves s on s.thought_id = t.id
    join normalized_profiles p on p.profile_id = t.user_id
    where t.visibility = 'public'
    group by t.user_id
  ),
  thought_counts as (
    select
      nt.thought_id,
      count(s.thought_id)::bigint as save_count
    from normalized_thoughts nt
    left join public.thought_second_brain_saves s on s.thought_id = nt.thought_id
    group by nt.thought_id
  )
  select jsonb_build_object(
    'profile_counts',
    coalesce(
      (
        select jsonb_object_agg(pc.profile_id::text, pc.save_count)
        from profile_counts pc
      ),
      '{}'::jsonb
    ),
    'thought_counts',
    coalesce(
      (
        select jsonb_object_agg(tc.thought_id::text, tc.save_count)
        from thought_counts tc
      ),
      '{}'::jsonb
    )
  );
$$;

grant execute on function public.open_brain_save_counts(uuid[], uuid[]) to anon;
grant execute on function public.open_brain_save_counts(uuid[], uuid[]) to authenticated;

commit;
