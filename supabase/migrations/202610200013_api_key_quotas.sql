-- Configurable API-key request quotas. Limits are platform defaults and can be
-- changed per plan without shipping application code.
create table if not exists public.marketplace_api_plan_limits (
  plan_code text primary key,
  requests_per_minute integer not null check (requests_per_minute > 0),
  requests_per_month integer not null check (requests_per_month > 0),
  updated_at timestamptz not null default now()
);

insert into public.marketplace_api_plan_limits(plan_code, requests_per_minute, requests_per_month)
values ('free', 60, 10000), ('pro', 120, 100000), ('premium', 300, 1000000)
on conflict (plan_code) do nothing;

alter table public.marketplace_api_plan_limits enable row level security;
drop policy if exists "Anyone can read API plan limits" on public.marketplace_api_plan_limits;
create policy "Anyone can read API plan limits" on public.marketplace_api_plan_limits
  for select to anon, authenticated using (true);
grant select on public.marketplace_api_plan_limits to anon, authenticated;
revoke insert, update, delete on public.marketplace_api_plan_limits from anon, authenticated;

alter table public.marketplace_api_keys
  add column if not exists minute_window timestamptz,
  add column if not exists minute_count integer not null default 0,
  add column if not exists month_window timestamptz,
  add column if not exists month_count integer not null default 0;

-- Keep the browser's owner-only revoke workflow while preventing clients from
-- editing the server-maintained quota counters or key metadata.
revoke update on public.marketplace_api_keys from anon, authenticated;
grant update (revoked_at) on public.marketplace_api_keys to authenticated;

-- Atomic fixed-window quota reservation. The digest is the only credential
-- accepted; the raw API key never reaches the database.
create or replace function public.consume_marketplace_api_key(p_key_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_key public.marketplace_api_keys%rowtype;
  effective_plan text := 'free';
  minute_limit integer;
  month_limit integer;
  current_minute timestamptz := date_trunc('minute', now());
  current_month timestamptz := date_trunc('month', now());
begin
  select k.* into matched_key
    from public.marketplace_api_keys as k
    where k.key_hash = p_key_hash and k.revoked_at is null
    for update;
  if not found then
    return jsonb_build_object('valid', false, 'allowed', false);
  end if;

  select s.plan_code into effective_plan
    from public.marketplace_subscriptions as s
    where s.owner_id = matched_key.owner_id
      and s.status in ('active', 'trialing')
      and s.plan_code in ('pro', 'premium')
    limit 1;
  effective_plan := coalesce(effective_plan, 'free');

  select l.requests_per_minute, l.requests_per_month
    into minute_limit, month_limit
    from public.marketplace_api_plan_limits as l
    where l.plan_code = effective_plan;
  if minute_limit is null or month_limit is null then
    return jsonb_build_object('valid', true, 'allowed', false, 'reason', 'plan_limits_missing');
  end if;

  if matched_key.minute_window is distinct from current_minute then
    matched_key.minute_count := 0;
  end if;
  if matched_key.month_window is distinct from current_month then
    matched_key.month_count := 0;
  end if;

  if matched_key.minute_count >= minute_limit or matched_key.month_count >= month_limit then
    return jsonb_build_object(
      'valid', true, 'allowed', false, 'plan', effective_plan,
      'owner_id', matched_key.owner_id,
      'minute_limit', minute_limit, 'minute_remaining', greatest(0, minute_limit - matched_key.minute_count),
      'month_limit', month_limit, 'month_remaining', greatest(0, month_limit - matched_key.month_count),
      'minute_reset', current_minute + interval '1 minute',
      'month_reset', current_month + interval '1 month'
    );
  end if;

  update public.marketplace_api_keys as k set
    minute_window = current_minute,
    minute_count = matched_key.minute_count + 1,
    month_window = current_month,
    month_count = matched_key.month_count + 1,
    last_used_at = now()
    where k.id = matched_key.id;

  return jsonb_build_object(
    'valid', true, 'allowed', true, 'plan', effective_plan, 'owner_id', matched_key.owner_id,
    'minute_limit', minute_limit, 'minute_remaining', greatest(0, minute_limit - matched_key.minute_count - 1),
    'month_limit', month_limit, 'month_remaining', greatest(0, month_limit - matched_key.month_count - 1),
    'minute_reset', current_minute + interval '1 minute',
    'month_reset', current_month + interval '1 month'
  );
end;
$$;

revoke all on function public.consume_marketplace_api_key(text) from public;
grant execute on function public.consume_marketplace_api_key(text) to anon, authenticated;
