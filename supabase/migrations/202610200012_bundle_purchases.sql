alter table public.marketplace_purchases
  alter column listing_id drop not null,
  add column if not exists bundle_id uuid references public.marketplace_bundles(id) on delete restrict;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'marketplace_purchases_listing_or_bundle_check'
      and conrelid = 'public.marketplace_purchases'::regclass
  ) then
    alter table public.marketplace_purchases
      add constraint marketplace_purchases_listing_or_bundle_check
      check ((listing_id is not null and bundle_id is null) or (listing_id is null and bundle_id is not null));
  end if;
end $$;

create index if not exists marketplace_purchases_buyer_bundle_idx
  on public.marketplace_purchases(buyer_id, bundle_id, status);

grant select on public.marketplace_purchases to authenticated;
