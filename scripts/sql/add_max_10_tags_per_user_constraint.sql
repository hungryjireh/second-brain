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
