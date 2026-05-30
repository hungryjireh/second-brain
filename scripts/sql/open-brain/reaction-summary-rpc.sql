begin;

create or replace function public.open_brain_reaction_summary(
  thought_ids uuid[] default '{}',
  viewer_id uuid default null
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with
  normalized_thoughts as (
    select distinct unnest(coalesce(thought_ids, '{}'::uuid[])) as thought_id
  ),
  totals as (
    select
      r.thought_id,
      r.type,
      count(*)::bigint as total_count
    from public.reactions r
    join normalized_thoughts nt on nt.thought_id = r.thought_id
    where r.type in ('felt_this', 'me_too', 'made_me_think')
    group by r.thought_id, r.type
  ),
  viewer_flags as (
    select
      r.thought_id,
      r.type,
      true as is_mine
    from public.reactions r
    join normalized_thoughts nt on nt.thought_id = r.thought_id
    where r.user_id = viewer_id
      and r.type in ('felt_this', 'me_too', 'made_me_think')
    group by r.thought_id, r.type
  ),
  summary_rows as (
    select
      nt.thought_id,
      coalesce(max(t.total_count) filter (where t.type = 'felt_this'), 0) as felt_this,
      coalesce(max(t.total_count) filter (where t.type = 'me_too'), 0) as me_too,
      coalesce(max(t.total_count) filter (where t.type = 'made_me_think'), 0) as made_me_think,
      coalesce(bool_or(v.is_mine) filter (where v.type = 'felt_this'), false) as mine_felt_this,
      coalesce(bool_or(v.is_mine) filter (where v.type = 'me_too'), false) as mine_me_too,
      coalesce(bool_or(v.is_mine) filter (where v.type = 'made_me_think'), false) as mine_made_me_think
    from normalized_thoughts nt
    left join totals t on t.thought_id = nt.thought_id
    left join viewer_flags v on v.thought_id = nt.thought_id
    group by nt.thought_id
  )
  select jsonb_build_object(
    'summary',
    coalesce(
      (
        select jsonb_object_agg(
          sr.thought_id::text,
          jsonb_build_object(
            'felt_this', sr.felt_this,
            'me_too', sr.me_too,
            'made_me_think', sr.made_me_think,
            'mine', jsonb_build_object(
              'felt_this', sr.mine_felt_this,
              'me_too', sr.mine_me_too,
              'made_me_think', sr.mine_made_me_think
            )
          )
        )
        from summary_rows sr
      ),
      '{}'::jsonb
    )
  );
$$;

grant execute on function public.open_brain_reaction_summary(uuid[], uuid) to anon;
grant execute on function public.open_brain_reaction_summary(uuid[], uuid) to authenticated;

commit;
