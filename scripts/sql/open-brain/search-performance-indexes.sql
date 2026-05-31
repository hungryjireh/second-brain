begin;

create extension if not exists pg_trgm;

-- Accelerate substring matches like ilike '%query%' on usernames.
create index if not exists idx_profiles_username_trgm
on public.profiles
using gin (username gin_trgm_ops);

-- Accelerate substring matches like ilike '%query%' on thought text.
create index if not exists idx_thoughts_content_text_trgm
on public.thoughts
using gin ((content->>'text') gin_trgm_ops);

commit;
