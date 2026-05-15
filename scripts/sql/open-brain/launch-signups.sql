create table if not exists public.launch_signups (
  id bigserial primary key,
  name text not null,
  email text not null unique,
  source text not null default 'landing-page',
  created_at timestamptz not null default now()
);

create index if not exists idx_launch_signups_created_at on public.launch_signups (created_at desc);
