-- Keep an audit trail every time a displayed account balance is reconciled
-- with the real balance in the bank app or wallet. Run after migration_005.

create table public.account_reconciliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  account_id uuid references public.accounts(id) on delete cascade not null,
  expected_balance numeric(14,2) not null,
  actual_balance numeric(14,2) not null,
  adjustment numeric(14,2) not null,
  reconciled_at timestamptz not null default now()
);

create index idx_account_reconciliations_account_date
  on public.account_reconciliations (account_id, reconciled_at desc);

alter table public.account_reconciliations enable row level security;

create policy "owns account reconciliations" on public.account_reconciliations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.account_reconciliations to authenticated;

-- Calculates the expected balance inside Postgres, writes the audit record,
-- and updates the account base balance in one transaction.
create or replace function public.reconcile_account(
  p_account_id uuid,
  p_actual_balance numeric
)
returns public.account_reconciliations
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_expected_balance numeric(14,2);
  v_adjustment numeric(14,2);
  v_reconciliation public.account_reconciliations;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_actual_balance is null then
    raise exception 'Actual balance is required';
  end if;

  select
    a.opening_balance + coalesce(sum(
      case
        when t.type = 'income' and t.account_id = a.id then t.amount
        when t.type = 'expense' and t.account_id = a.id then -t.amount
        when t.type = 'transfer' and t.account_id = a.id then -t.amount
        when t.type = 'transfer' and t.to_account_id = a.id then t.amount
        else 0
      end
    ), 0)
  into v_expected_balance
  from public.accounts a
  left join public.transactions t
    on t.account_id = a.id or t.to_account_id = a.id
  where a.id = p_account_id
    and a.user_id = auth.uid()
  group by a.id, a.opening_balance;

  if not found then
    raise exception 'Account not found';
  end if;

  v_adjustment := p_actual_balance - v_expected_balance;

  update public.accounts
  set opening_balance = opening_balance + v_adjustment
  where id = p_account_id
    and user_id = auth.uid();

  insert into public.account_reconciliations (
    user_id,
    account_id,
    expected_balance,
    actual_balance,
    adjustment
  )
  values (
    auth.uid(),
    p_account_id,
    v_expected_balance,
    p_actual_balance,
    v_adjustment
  )
  returning * into v_reconciliation;

  return v_reconciliation;
end;
$$;

revoke all on function public.reconcile_account(uuid, numeric) from public;
grant execute on function public.reconcile_account(uuid, numeric) to authenticated;
