-- PostgREST column grants keep source code out of public SELECT responses.
-- Content is returned only by server routes after free/ownership/purchase checks.
revoke select on public.agents from anon, authenticated;
grant select (
  id, name, description, image_url, price_usd, user_id, owner_id, is_free, created_at,
  "statusType", token_address, token_symbol, pool_address, fee_selection, vault_mode,
  mcp_server_url, x402_url, category, tags, language, requirements, use_cases, links
) on public.agents to anon, authenticated;

revoke insert, update on public.agents from authenticated;
grant insert (
  id, name, description, image_url, price_usd, user_id, owner_id, is_free, created_at,
  "statusType", agent_code, prompt_body, tool_code, skill_content, mcp_server_url, x402_url,
  category, tags, language, requirements, use_cases, links
) on public.agents to authenticated;
grant update (
  name, description, image_url, price_usd, is_free, "statusType", token_address,
  token_symbol, pool_address, fee_selection, vault_mode, agent_code,
  prompt_body, tool_code, skill_content, mcp_server_url, x402_url, category, tags, language,
  requirements, use_cases, links
) on public.agents to authenticated;
