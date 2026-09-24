-- Cash is a separate spending account. A cash withdrawal is recorded as a
-- transfer from BCA to this account, then cash expenses reduce its balance.
-- Run this once in the Supabase SQL editor after migration_004_accounts.sql.

insert into public.accounts (user_id, name, kind, color, is_payroll)
select id, 'Cash', 'spending', '#34d399', false
from auth.users
on conflict (user_id, name) do nothing;
