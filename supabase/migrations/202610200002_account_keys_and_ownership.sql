-- Link future marketplace writes to Supabase Auth without changing existing
-- wallet-based creator addresses in public.agents.user_id.
alter table public.agents
  add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.agents
  add column if not exists agent_code text,
  add column if not exists prompt_body text,
  add column if not exists tool_code text,
  add column if not exists skill_content text,
  add column if not exists token_symbol text,
  add column if not exists mcp_server_url text,
  add column if not exists x402_url text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists category text,
  add column if not exists language text,
  add column if not exists requirements jsonb not null default '[]'::jsonb,
  add column if not exists use_cases jsonb not null default '[]'::jsonb,
  add column if not exists links jsonb not null default '[]'::jsonb;

create index if not exists agents_owner_id_idx on public.agents(owner_id);

-- Marketplace listing metadata stays public. Authenticated users may only
-- create, edit, or remove rows linked to their Supabase Auth user id.
alter table public.agents enable row level security;

do $$
declare existing_policy record;
begin
  for existing_policy in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'agents'
  loop
    execute format('drop policy if exists %I on public.agents', existing_policy.policyname);
  end loop;
end;
$$;

create policy "Marketplace listings are public"
  on public.agents for select
  to anon, authenticated
  using (true);

create policy "Creators can publish their own listings"
  on public.agents for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Creators can edit their own listings"
  on public.agents for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Creators can delete their own listings"
  on public.agents for delete
  to authenticated
  using (owner_id = (select auth.uid()));

grant select on public.agents to anon, authenticated;
grant insert, update, delete on public.agents to authenticated;

create table if not exists public.marketplace_profiles (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null default '',
  bio text not null default '',
  avatar_url text,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketplace_profiles enable row level security;
drop policy if exists "Marketplace profiles are public" on public.marketplace_profiles;
create policy "Marketplace profiles are public"
  on public.marketplace_profiles for select
  to anon, authenticated
  using (true);
drop policy if exists "Users can create their own profile" on public.marketplace_profiles;
create policy "Users can create their own profile"
  on public.marketplace_profiles for insert
  to authenticated
  with check (owner_id = (select auth.uid()));
drop policy if exists "Users can update their own profile" on public.marketplace_profiles;
create policy "Users can update their own profile"
  on public.marketplace_profiles for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
grant select on public.marketplace_profiles to anon, authenticated;
grant insert, update on public.marketplace_profiles to authenticated;

create table if not exists public.marketplace_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.agents(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (length(trim(comment)) between 1 and 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, reviewer_id)
);

create index if not exists marketplace_reviews_listing_time_idx on public.marketplace_reviews(listing_id, created_at desc);
alter table public.marketplace_reviews enable row level security;
drop policy if exists "Listing reviews are public" on public.marketplace_reviews;
create policy "Listing reviews are public" on public.marketplace_reviews for select to anon, authenticated using (true);
drop policy if exists "Users can create their own reviews" on public.marketplace_reviews;
create policy "Users can create their own reviews" on public.marketplace_reviews for insert to authenticated with check (reviewer_id = (select auth.uid()));
drop policy if exists "Users can update their own reviews" on public.marketplace_reviews;
create policy "Users can update their own reviews" on public.marketplace_reviews for update to authenticated using (reviewer_id = (select auth.uid())) with check (reviewer_id = (select auth.uid()));
drop policy if exists "Users can delete their own reviews" on public.marketplace_reviews;
create policy "Users can delete their own reviews" on public.marketplace_reviews for delete to authenticated using (reviewer_id = (select auth.uid()));
grant select on public.marketplace_reviews to anon, authenticated;
grant insert, update, delete on public.marketplace_reviews to authenticated;

-- Store only a SHA-256 digest of each API key. The secret is shown once at creation.
create table if not exists public.marketplace_api_keys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Default key',
  key_prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists marketplace_api_keys_owner_idx
  on public.marketplace_api_keys(owner_id, created_at desc);

alter table public.marketplace_api_keys enable row level security;

drop policy if exists "Owners can view their API keys" on public.marketplace_api_keys;
create policy "Owners can view their API keys"
  on public.marketplace_api_keys for select
  to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Owners can create their API keys" on public.marketplace_api_keys;
create policy "Owners can create their API keys"
  on public.marketplace_api_keys for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can revoke their API keys" on public.marketplace_api_keys;
create policy "Owners can revoke their API keys"
  on public.marketplace_api_keys for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create table if not exists public.marketplace_api_usage (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  api_key_id uuid not null references public.marketplace_api_keys(id) on delete cascade,
  method text not null,
  endpoint text not null,
  status_code integer not null default 200,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_api_usage_owner_time_idx
  on public.marketplace_api_usage(owner_id, created_at desc);

alter table public.marketplace_api_usage enable row level security;

drop policy if exists "Owners can view their API usage" on public.marketplace_api_usage;
create policy "Owners can view their API usage"
  on public.marketplace_api_usage for select
  to authenticated
  using (owner_id = (select auth.uid()));

-- The API accepts a random secret, hashes it in the server runtime, then calls
-- this function. The raw secret and digest are never returned by the function.
create or replace function public.record_marketplace_api_usage(
  p_key_hash text,
  p_method text,
  p_endpoint text,
  p_status_code integer default 200
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_key public.marketplace_api_keys%rowtype;
begin
  update public.marketplace_api_keys as k
    set last_used_at = now()
    where k.key_hash = p_key_hash and k.revoked_at is null
    returning k.* into matched_key;

  if not found then
    return false;
  end if;

    insert into public.marketplace_api_usage(owner_id, api_key_id, method, endpoint, status_code)
    values (
      matched_key.owner_id,
      matched_key.id,
      left(upper(p_method), 10),
      left(regexp_replace(p_endpoint, '[?#].*$', ''), 160),
      greatest(100, least(p_status_code, 599))
    );
  return true;
end;
$$;

revoke all on function public.record_marketplace_api_usage(text, text, text, integer) from public;
grant execute on function public.record_marketplace_api_usage(text, text, text, integer) to anon, authenticated;

create table if not exists public.marketplace_competitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  prize_pool_usd numeric(12,2) not null default 0 check (prize_pool_usd >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'upcoming' check (status in ('upcoming','active','completed')),
  ranking_metric text not null default 'volume' check (ranking_metric in ('volume','market_cap','reviews','items')),
  winner_user_id uuid references auth.users(id) on delete set null,
  winner_display_name text,
  winner_prize_usd numeric(12,2),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists marketplace_competitions_status_dates_idx
  on public.marketplace_competitions(status, starts_at, ends_at);
alter table public.marketplace_competitions enable row level security;
drop policy if exists "Competition listings are public" on public.marketplace_competitions;
create policy "Competition listings are public"
  on public.marketplace_competitions for select
  to anon, authenticated
  using (true);
grant select on public.marketplace_competitions to anon, authenticated;

create table if not exists public.marketplace_bundles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 2 and 120),
  description text not null default '',
  image_url text,
  price_usd numeric(12,2) not null default 0 check (price_usd >= 0),
  is_free boolean not null default true,
  status text not null default 'published' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_bundle_items (
  bundle_id uuid not null references public.marketplace_bundles(id) on delete cascade,
  item_id uuid not null references public.agents(id) on delete cascade,
  position integer not null default 0,
  primary key (bundle_id, item_id)
);

create index if not exists marketplace_bundles_owner_idx on public.marketplace_bundles(owner_id);
alter table public.marketplace_bundles enable row level security;
alter table public.marketplace_bundle_items enable row level security;
drop policy if exists "Published bundles are public" on public.marketplace_bundles;
create policy "Published bundles are public" on public.marketplace_bundles for select to anon, authenticated using (status = 'published' or owner_id = (select auth.uid()));
drop policy if exists "Creators can create bundles" on public.marketplace_bundles;
create policy "Creators can create bundles" on public.marketplace_bundles for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "Creators can edit bundles" on public.marketplace_bundles;
create policy "Creators can edit bundles" on public.marketplace_bundles for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "Creators can remove bundles" on public.marketplace_bundles;
create policy "Creators can remove bundles" on public.marketplace_bundles for delete to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "Bundle contents are public" on public.marketplace_bundle_items;
create policy "Bundle contents are public" on public.marketplace_bundle_items for select to anon, authenticated using (exists (select 1 from public.marketplace_bundles b where b.id = bundle_id and (b.status = 'published' or b.owner_id = (select auth.uid()))));
drop policy if exists "Bundle owners manage contents" on public.marketplace_bundle_items;
create policy "Bundle owners manage contents" on public.marketplace_bundle_items for all to authenticated using (exists (select 1 from public.marketplace_bundles b where b.id = bundle_id and b.owner_id = (select auth.uid()))) with check (exists (select 1 from public.marketplace_bundles b where b.id = bundle_id and b.owner_id = (select auth.uid())));
grant select on public.marketplace_bundles, public.marketplace_bundle_items to anon, authenticated;
grant insert, update, delete on public.marketplace_bundles, public.marketplace_bundle_items to authenticated;

-- Rate-limit prompt execution to protect the configured model provider.
create table if not exists public.marketplace_prompt_runs (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.agents(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists marketplace_prompt_runs_owner_time_idx
  on public.marketplace_prompt_runs(owner_id, created_at desc);
alter table public.marketplace_prompt_runs enable row level security;
drop policy if exists "Owners can view their prompt runs" on public.marketplace_prompt_runs;
create policy "Owners can view their prompt runs"
  on public.marketplace_prompt_runs for select to authenticated
  using (owner_id = (select auth.uid()));
grant select on public.marketplace_prompt_runs to authenticated;

create or replace function public.consume_marketplace_prompt_quota(p_listing_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  recent_runs integer;
begin
  if current_user_id is null then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));
  delete from public.marketplace_prompt_runs where created_at < now() - interval '30 days';
  select count(*) into recent_runs from public.marketplace_prompt_runs
    where owner_id = current_user_id and created_at >= now() - interval '1 minute';
  if recent_runs >= 10 then return false; end if;
  insert into public.marketplace_prompt_runs(owner_id, listing_id)
    values (current_user_id, p_listing_id);
  return true;
end;
$$;
revoke all on function public.consume_marketplace_prompt_quota(uuid) from public;
grant execute on function public.consume_marketplace_prompt_quota(uuid) to authenticated;
