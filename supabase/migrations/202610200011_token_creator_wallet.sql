alter table public.agents
  add column if not exists token_creator_wallet text;

grant select (token_creator_wallet) on public.agents to anon, authenticated;
grant update (token_creator_wallet) on public.agents to authenticated;
