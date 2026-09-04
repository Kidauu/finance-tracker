-- Run this in the Supabase SQL editor right after creating the project.

-- categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  color text default '#6366f1',
  created_at timestamptz default now(),
  unique (user_id, type, name)
);

-- accounts (Seabank for daily spending, BCA for payroll & emergency fund)
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

-- transactions. 'transfer' moves money between accounts and is excluded from
-- income and expense totals — counting it would inflate both sides of the
-- same rupiah.
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  to_account_id uuid references public.accounts(id) on delete set null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount numeric(14,2) not null check (amount > 0),
  description text,
  transaction_date date not null default current_date,
  created_at timestamptz default now(),
  constraint transactions_transfer_accounts_check check (
    (type = 'transfer'
      and account_id is not null
      and to_account_id is not null
      and account_id <> to_account_id)
    or (type <> 'transfer' and to_account_id is null)
  )
);

create index idx_transactions_user_date on public.transactions (user_id, transaction_date desc);
create index idx_transactions_category on public.transactions (category_id);
create index idx_transactions_account on public.transactions (account_id);

-- row level security
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.accounts enable row level security;

create policy "owns categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owns transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owns accounts" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- explicit grants — required on Supabase projects created after 30 May 2026;
-- tables are no longer auto-exposed to the PostgREST API without this
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.accounts to authenticated;

-- holidays — user-maintained "tanggal merah" list, used to push the computed
-- payday backward when the 28th lands on a weekend or a holiday
create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  holiday_date date not null,
  name text,
  created_at timestamptz default now(),
  unique (user_id, holiday_date)
);

alter table public.holidays enable row level security;

create policy "owns holidays" on public.holidays
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.holidays to authenticated;

-- budgets — one monthly "pot" allocation per expense category
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  monthly_amount numeric(14,2) not null check (monthly_amount >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, category_id)
);

alter table public.budgets enable row level security;

create policy "owns budgets" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.budgets to authenticated;
