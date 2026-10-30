-- Marketplace listing amounts are now stored in INR. Existing USD prices are
-- intentionally not converted: creators must set the correct INR amount.
alter table public.agents
  add column if not exists price_inr numeric(12,2) check (price_inr is null or price_inr >= 0);

alter table public.marketplace_bundles
  add column if not exists price_inr numeric(12,2) check (price_inr is null or price_inr >= 0);

-- Free products have an unambiguous zero price. Existing paid listings stay
-- NULL until their creators review and enter an INR amount.
update public.agents set price_inr = 0 where is_free = true and price_inr is null;
update public.marketplace_bundles set price_inr = 0 where is_free = true and price_inr is null;
