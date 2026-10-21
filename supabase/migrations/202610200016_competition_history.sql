alter table public.agents add column if not exists vault_mode boolean not null default false;
grant select (vault_mode) on public.agents to anon, authenticated;
grant update (vault_mode) on public.agents to authenticated;

create table if not exists public.marketplace_competition_volume_snapshots (
  id bigint generated always as identity primary key,
  competition_id uuid not null references public.marketplace_competitions(id) on delete cascade,
  listing_id uuid not null references public.agents(id) on delete cascade,
  sampled_at timestamptz not null default now(),
  volume_24h_usd numeric(20,6) not null check (volume_24h_usd >= 0),
  unique (competition_id, listing_id, sampled_at)
);
create index if not exists marketplace_competition_snapshots_lookup_idx
  on public.marketplace_competition_volume_snapshots(competition_id, listing_id, sampled_at);
alter table public.marketplace_competition_volume_snapshots enable row level security;
drop policy if exists "Competition volume snapshots are public" on public.marketplace_competition_volume_snapshots;
create policy "Competition volume snapshots are public"
  on public.marketplace_competition_volume_snapshots for select to anon, authenticated using (true);
grant select on public.marketplace_competition_volume_snapshots to anon, authenticated;

create table if not exists public.marketplace_competition_results (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.marketplace_competitions(id) on delete cascade,
  listing_id uuid not null references public.agents(id) on delete cascade,
  listing_name text not null default '',
  owner_id uuid references auth.users(id) on delete set null,
  rank smallint not null check (rank between 1 and 3),
  estimated_volume_usd numeric(20,6) not null check (estimated_volume_usd >= 0),
  scored_from timestamptz not null,
  scored_through timestamptz not null,
  calculated_at timestamptz not null default now(),
  unique (competition_id, rank),
  unique (competition_id, listing_id),
  check (scored_through > scored_from)
);
alter table public.marketplace_competition_results enable row level security;
drop policy if exists "Competition results are public" on public.marketplace_competition_results;
create policy "Competition results are public"
  on public.marketplace_competition_results for select to anon, authenticated using (true);
grant select on public.marketplace_competition_results to anon, authenticated;
