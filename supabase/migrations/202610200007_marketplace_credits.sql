create table if not exists public.marketplace_credit_accounts (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(14,4) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.marketplace_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,4) not null check (amount <> 0),
  kind text not null check (kind in ('topup','prompt_run','refund')),
  provider_ref text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists marketplace_credit_transactions_owner_time_idx
  on public.marketplace_credit_transactions(owner_id, created_at desc);
alter table public.marketplace_credit_accounts enable row level security;
alter table public.marketplace_credit_transactions enable row level security;
drop policy if exists "Users can view their credit balance" on public.marketplace_credit_accounts;
create policy "Users can view their credit balance" on public.marketplace_credit_accounts
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "Users can view their credit transactions" on public.marketplace_credit_transactions;
create policy "Users can view their credit transactions" on public.marketplace_credit_transactions
  for select to authenticated using (owner_id = (select auth.uid()));
grant select on public.marketplace_credit_accounts, public.marketplace_credit_transactions to authenticated;

create or replace function public.apply_marketplace_credit_topup(p_owner_id uuid, p_amount numeric, p_reference text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' or p_amount <= 0 or p_amount > 10000 or length(p_reference) > 200 then return false; end if;
  insert into public.marketplace_credit_transactions(owner_id, amount, kind, provider_ref)
    values (p_owner_id, p_amount, 'topup', p_reference) on conflict (provider_ref) do nothing;
  if not found then return true; end if;
  insert into public.marketplace_credit_accounts(owner_id, balance, updated_at)
    values (p_owner_id, p_amount, now())
    on conflict (owner_id) do update set balance = public.marketplace_credit_accounts.balance + excluded.balance, updated_at = now();
  return true;
end;
$$;
revoke all on function public.apply_marketplace_credit_topup(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.apply_marketplace_credit_topup(uuid, numeric, text) to service_role;

create or replace function public.consume_marketplace_credits(p_amount numeric, p_reference text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  current_balance numeric;
begin
  if current_user_id is null or p_amount <= 0 or p_amount > 100 or length(p_reference) > 200 then return false; end if;
  insert into public.marketplace_credit_accounts(owner_id, balance) values (current_user_id, 0) on conflict (owner_id) do nothing;
  select balance into current_balance from public.marketplace_credit_accounts where owner_id = current_user_id for update;
  if current_balance < p_amount then return false; end if;
  insert into public.marketplace_credit_transactions(owner_id, amount, kind, provider_ref)
    values (current_user_id, -p_amount, 'prompt_run', p_reference) on conflict (provider_ref) do nothing;
  if not found then return false; end if;
  update public.marketplace_credit_accounts set balance = balance - p_amount, updated_at = now() where owner_id = current_user_id;
  return true;
end;
$$;
revoke all on function public.consume_marketplace_credits(numeric, text) from public;
grant execute on function public.consume_marketplace_credits(numeric, text) to authenticated;

create or replace function public.refund_marketplace_credits(p_owner_id uuid, p_amount numeric, p_reference text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  debit public.marketplace_credit_transactions%rowtype;
begin
  if auth.role() <> 'service_role' or p_amount <= 0 then return false; end if;
  select * into debit from public.marketplace_credit_transactions where provider_ref = p_reference and owner_id = p_owner_id and kind = 'prompt_run';
  if not found or debit.amount <> -p_amount then return false; end if;
  insert into public.marketplace_credit_transactions(owner_id, amount, kind, provider_ref)
    values (p_owner_id, p_amount, 'refund', 'refund:' || p_reference) on conflict (provider_ref) do nothing;
  if not found then return true; end if;
  update public.marketplace_credit_accounts set balance = balance + p_amount, updated_at = now() where owner_id = p_owner_id;
  return true;
end;
$$;
revoke all on function public.refund_marketplace_credits(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.refund_marketplace_credits(uuid, numeric, text) to service_role;
