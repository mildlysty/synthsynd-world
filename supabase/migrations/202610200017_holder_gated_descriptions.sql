create table if not exists public.marketplace_holder_gated_descriptions (
  listing_id uuid primary key references public.agents(id) on delete cascade,
  description text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.marketplace_holder_gated_descriptions enable row level security;
revoke all on public.marketplace_holder_gated_descriptions from anon, authenticated;
grant all on public.marketplace_holder_gated_descriptions to service_role;

insert into public.marketplace_holder_gated_descriptions(listing_id, description)
select id, coalesce(description, '') from public.agents
where vault_mode is true and token_address is not null
on conflict (listing_id) do update set description = excluded.description, updated_at = now();

update public.agents set description = '' where vault_mode is true and token_address is not null;

create or replace function public.sync_holder_gated_description()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.vault_mode is true and new.token_address is not null then
    insert into public.marketplace_holder_gated_descriptions(listing_id, description, updated_at)
    values (new.id, coalesce(new.description, ''), now())
    on conflict (listing_id) do update
      set description = case
        when nullif(btrim(new.description), '') is not null then new.description
        else public.marketplace_holder_gated_descriptions.description
      end,
      updated_at = now();
    new.description := '';
  else
    delete from public.marketplace_holder_gated_descriptions where listing_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists agents_sync_holder_gated_description on public.agents;
create trigger agents_sync_holder_gated_description
  before insert or update of description, vault_mode, token_address on public.agents
  for each row execute function public.sync_holder_gated_description();
