-- Merge legacy columns in public.entries:
--   description -> raw_text (keep raw_text)
--   content     -> summary  (keep summary)
--
-- Safe to re-run:
-- - Adds target columns only if missing
-- - Backfills only when target is null/blank
-- - Drops legacy columns only if they exist

begin;

alter table if exists public.entries
  add column if not exists raw_text text,
  add column if not exists summary text;

-- Prefer existing non-empty target values.
-- If target is empty/null, use legacy source.
update public.entries
set raw_text = nullif(btrim(description), '')
where (raw_text is null or btrim(raw_text) = '')
  and description is not null
  and btrim(description) <> '';

update public.entries
set summary = nullif(btrim(content), '')
where (summary is null or btrim(summary) = '')
  and content is not null
  and btrim(content) <> '';

alter table if exists public.entries
  drop column if exists description,
  drop column if exists content;

commit;
