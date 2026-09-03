-- Fixes duplicate categories caused by a race in the old client-side seeding
-- logic (fired twice — e.g. two tabs open at once — before either insert's
-- result was visible to the other, so both inserted the same "missing" rows).
-- Run once in the SQL editor.

-- 1. de-duplicate: for each (user_id, type, name) group, keep one row and
--    drop the rest. Budgets pointing at a deleted duplicate cascade-delete
--    (harmless — they were all Rp 0 anyway); transactions pointing at one
--    fall back to null (uncategorized) per the existing FK rule, but re-run
--    this only when no real transactions used the duplicates yet.
delete from public.categories a
using public.categories b
where a.id > b.id
  and a.user_id = b.user_id
  and a.type = b.type
  and a.name = b.name;

-- 2. stop it from ever happening again — the app now upserts against this
--    constraint with ignoreDuplicates instead of diffing client-side first
alter table public.categories
  add constraint categories_user_type_name_key unique (user_id, type, name);
