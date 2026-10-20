alter table public.agents
  add column if not exists launch_config_key text;

grant select (launch_config_key) on public.agents to anon, authenticated;
grant update (launch_config_key) on public.agents to authenticated;
