-- Multi-account support: Seabank (daily spending) + BCA (payroll & emergency fund).
-- Run once in the SQL editor.

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  kind text not null default 'spending' check (kind in ('spending', 'savings')),
  color text default '#6366f1',
  opening_balance numeric(14,2) not null default 0,
  is_payroll boolean not null default false,
  created_at timestamptz default now(),
  unique (user_id, name)
);

alter table public.accounts enable row level security;

create policy "owns accounts" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.accounts to authenticated;

-- transactions gain a source account, plus a destination for transfers
alter table public.transactions
  add column account_id uuid references public.accounts(id) on delete set null,
  add column to_account_id uuid references public.accounts(id) on delete set null;

create index idx_transactions_account on public.transactions (account_id);

-- 'transfer' joins income/expense. Transfers move money between accounts and
-- are deliberately excluded from income and expense totals — counting them
-- would inflate both sides of the same rupiah.
alter table public.transactions drop constraint transactions_type_check;

alter table public.transactions
  add constraint transactions_type_check check (type in ('income', 'expense', 'transfer'));

-- a transfer needs two distinct accounts; nothing else may set a destination
alter table public.transactions
  add constraint transactions_transfer_accounts_check check (
    (type = 'transfer'
      and account_id is not null
      and to_account_id is not null
      and account_id <> to_account_id)
    or (type <> 'transfer' and to_account_id is null)
  );

-- seed the two real accounts
insert into public.accounts (user_id, name, kind, color, is_payroll)
select id, 'Seabank', 'spending', '#f97316', false from auth.users
on conflict (user_id, name) do nothing;

insert into public.accounts (user_id, name, kind, color, is_payroll)
select id, 'BCA', 'savings', '#0ea5e9', true from auth.users
on conflict (user_id, name) do nothing;

-- backfill existing rows: salary landed in BCA, everything else came out of Seabank
update public.transactions t
set account_id = a.id
from public.accounts a
where a.user_id = t.user_id
  and a.name = 'BCA'
  and t.type = 'income'
  and t.account_id is null;

update public.transactions t
set account_id = a.id
from public.accounts a
where a.user_id = t.user_id
  and a.name = 'Seabank'
  and t.account_id is null;
