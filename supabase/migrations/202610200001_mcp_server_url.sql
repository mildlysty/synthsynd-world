alter table public.agents
  add column if not exists mcp_server_url text;
