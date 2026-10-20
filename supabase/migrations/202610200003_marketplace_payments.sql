alter table public.marketplace_profiles
  add column if not exists stripe_account_id text unique;

create table if not exists public.marketplace_seller_accounts (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  stripe_account_id text not null unique,
  country text not null,
  details_submitted boolean not null default false,
  charges_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.marketplace_seller_accounts enable row level security;
drop policy if exists "Sellers can view their payout account" on public.marketplace_seller_accounts;
create policy "Sellers can view their payout account" on public.marketplace_seller_accounts
  for select to authenticated using (owner_id = (select auth.uid()));
grant select on public.marketplace_seller_accounts to authenticated;

create table if not exists public.marketplace_purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.agents(id) on delete restrict,
  stripe_session_id text not null unique,
  stripe_payment_intent_id text,
  amount_total integer not null check (amount_total >= 0),
  currency text not null default 'usd',
  status text not null default 'pending' check (status in ('pending','paid','refunded','expired')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists marketplace_purchases_buyer_listing_idx
  on public.marketplace_purchases(buyer_id, listing_id, status);
alter table public.marketplace_purchases enable row level security;
drop policy if exists "Buyers can view their purchases" on public.marketplace_purchases;
create policy "Buyers can view their purchases" on public.marketplace_purchases
  for select to authenticated using (buyer_id = (select auth.uid()));
grant select on public.marketplace_purchases to authenticated;

create table if not exists public.marketplace_stripe_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);
alter table public.marketplace_stripe_events enable row level security;
revoke all on public.marketplace_stripe_events from anon, authenticated;
