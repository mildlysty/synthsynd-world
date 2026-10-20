alter table public.agents
  add column if not exists publication_status text not null default 'published';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.agents'::regclass
      and conname = 'agents_publication_status_check'
  ) then
    alter table public.agents
      add constraint agents_publication_status_check
      check (publication_status in ('pending', 'published', 'rejected', 'suspended'));
  end if;
end;
$$;

create index if not exists agents_publication_status_created_idx
  on public.agents(publication_status, created_at desc);

-- Owners can still see their own listing drafts and moderation results. Other
-- users only receive listings approved for public display.
drop policy if exists "Marketplace listings are public" on public.agents;
create policy "Marketplace listings are public"
  on public.agents for select
  to anon, authenticated
  using (publication_status = 'published' or owner_id = (select auth.uid()));

create table if not exists public.marketplace_moderation_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.agents(id) on delete cascade,
  moderator_id uuid not null references auth.users(id) on delete restrict,
  previous_status text not null check (previous_status in ('pending', 'published', 'rejected', 'suspended')),
  new_status text not null check (new_status in ('pending', 'published', 'rejected', 'suspended')),
  reason text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists marketplace_moderation_events_listing_time_idx
  on public.marketplace_moderation_events(listing_id, created_at desc);
alter table public.marketplace_moderation_events enable row level security;
revoke all on public.marketplace_moderation_events from anon, authenticated;
grant all on public.marketplace_moderation_events to service_role;

create or replace function public.moderate_marketplace_listing(
  p_listing_id uuid,
  p_moderator_id uuid,
  p_new_status text,
  p_reason text default ''
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_status text;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    or p_listing_id is null
    or p_moderator_id is null
    or p_new_status is null
    or p_new_status not in ('pending', 'published', 'rejected', 'suspended')
    or length(coalesce(p_reason, '')) > 1000
  then return jsonb_build_object('success', false, 'error', 'invalid_request'); end if;

  select a.publication_status into old_status
    from public.agents as a where a.id = p_listing_id for update;
  if not found then return jsonb_build_object('success', false, 'error', 'not_found'); end if;

  update public.agents set publication_status = p_new_status where id = p_listing_id;
  insert into public.marketplace_moderation_events(
    listing_id, moderator_id, previous_status, new_status, reason
  ) values (
    p_listing_id, p_moderator_id, old_status, p_new_status, left(coalesce(p_reason, ''), 1000)
  );

  return jsonb_build_object('success', true, 'previous_status', old_status, 'new_status', p_new_status);
end;
$$;

revoke all on function public.moderate_marketplace_listing(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.moderate_marketplace_listing(uuid, uuid, text, text) to service_role;
