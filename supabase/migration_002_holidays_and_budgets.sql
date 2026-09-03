-- Run this once in the SQL editor of your EXISTING project (schema.sql already applied).
-- Adds: holidays (for payday adjustment) and budgets (per-category monthly "pots").

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
