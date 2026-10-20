alter table public.marketplace_bundles
  add column if not exists category text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists language text;
