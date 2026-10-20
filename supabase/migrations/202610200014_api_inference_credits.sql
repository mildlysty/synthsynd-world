-- API-key inference is debited from the same credits wallet as prompt chat.
-- Only server-role callers may charge a supplied owner; the public client RPC
-- remains bound to auth.uid().
create or replace function public.consume_marketplace_credits_for_owner(
  p_owner_id uuid,
  p_amount numeric,
  p_reference text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_balance numeric;
begin
  if auth.role() <> 'service_role'
    or p_owner_id is null
    or p_amount <= 0
    or p_amount > 100
    or length(p_reference) > 200
  then return false; end if;

  insert into public.marketplace_credit_accounts(owner_id, balance)
    values (p_owner_id, 0) on conflict (owner_id) do nothing;
  select balance into current_balance
    from public.marketplace_credit_accounts where owner_id = p_owner_id for update;
  if current_balance < p_amount then return false; end if;

  insert into public.marketplace_credit_transactions(owner_id, amount, kind, provider_ref)
    values (p_owner_id, -p_amount, 'prompt_run', p_reference)
    on conflict (provider_ref) do nothing;
  if not found then return false; end if;
  update public.marketplace_credit_accounts
    set balance = balance - p_amount, updated_at = now()
    where owner_id = p_owner_id;
  return true;
end;
$$;

revoke all on function public.consume_marketplace_credits_for_owner(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.consume_marketplace_credits_for_owner(uuid, numeric, text) to service_role;
