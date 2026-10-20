create table if not exists public.marketplace_competition_entries (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.marketplace_competitions(id) on delete cascade,
  listing_id uuid not null references public.agents(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'entered' check (status in ('entered','accepted','disqualified')),
  created_at timestamptz not null default now(),
  unique (competition_id, listing_id)
);
create index if not exists marketplace_competition_entries_competition_idx
  on public.marketplace_competition_entries(competition_id, created_at);
alter table public.marketplace_competition_entries enable row level security;
drop policy if exists "Competition entries are public" on public.marketplace_competition_entries;
create policy "Competition entries are public" on public.marketplace_competition_entries
  for select to anon, authenticated using (true);
drop policy if exists "Creators can enter their own listings" on public.marketplace_competition_entries;
create policy "Creators can enter their own listings" on public.marketplace_competition_entries
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and exists (
      select 1 from public.marketplace_competitions c
      where c.id = competition_id and c.status in ('upcoming','active') and c.ends_at > now()
    ) and exists (
      select 1 from public.agents a where a.id = listing_id and a.owner_id = (select auth.uid()) and a.token_address is not null
    )
  );
grant select on public.marketplace_competition_entries to anon, authenticated;
grant insert on public.marketplace_competition_entries to authenticated;
