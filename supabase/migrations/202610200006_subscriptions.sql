create table if not exists public.marketplace_subscriptions (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan_code text not null default 'free' check (plan_code in ('free','pro','premium','enterprise')),
  status text not null default 'inactive',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.marketplace_subscriptions enable row level security;
drop policy if exists "Users can view their own subscription" on public.marketplace_subscriptions;
create policy "Users can view their own subscription" on public.marketplace_subscriptions
  for select to authenticated using (owner_id = (select auth.uid()));
grant select on public.marketplace_subscriptions to authenticated;
