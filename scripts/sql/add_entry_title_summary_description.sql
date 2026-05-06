alter table if exists public.entries
  add column if not exists title text,
  add column if not exists summary text,
  add column if not exists description text;
