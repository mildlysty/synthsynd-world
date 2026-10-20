import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateAndRecordApiKey } from "../api/v1/record-key-usage";
import { searchCdpBazaar } from "../api/_lib/x402-bazaar";

type JsonRpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

const tools = [
  {
    name: "search_marketplace",
    description: "Search public Synthsynd World listings by text and listing type.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Words to match in a listing name or description." },
        type: { type: "string", enum: ["all", "agent", "prompt", "tool", "mcp", "skill", "bundle"] },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_listing",
    description: "Get public metadata for one marketplace listing. Paid source content is not returned by this read-only tool.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false },
  },
  {
    name: "search_x402_services",
    description: "Search Coinbase's x402 Bazaar for paid HTTP services. Returns catalog metadata and payment requirements; it does not make a paid request.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 2, maxLength: 400, description: "What kind of paid service to find." },
        network: { type: "string", description: "Optional CAIP-2 network filter, for example eip155:8453." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
];

function rpcError(id: JsonRpcRequest["id"], code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status: 200 });
}

export async function POST(request: Request) {
  if (!await validateAndRecordApiKey(request, "POST", "/mcp")) {
    return NextResponse.json({ error: "A valid Synthsynd API key is required." }, { status: 401 });
  }

  let rpc: JsonRpcRequest;
  try { rpc = await request.json(); }
  catch { return NextResponse.json({ error: "Request must contain one JSON-RPC object." }, { status: 400 }); }
  if (!rpc || Array.isArray(rpc) || rpc.jsonrpc !== "2.0" || typeof rpc.method !== "string") {
    return rpcError(rpc?.id, -32600, "Invalid JSON-RPC request.");
  }
  if (rpc.method === "notifications/initialized") return new NextResponse(null, { status: 202 });

  if (rpc.method === "initialize") {
    return NextResponse.json({
      jsonrpc: "2.0", id: rpc.id ?? null,
      result: {
        protocolVersion: "2025-03-26",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "synthsynd-world-marketplace", version: "1.0.0" },
      },
    });
  }

  if (rpc.method === "ping") return NextResponse.json({ jsonrpc: "2.0", id: rpc.id ?? null, result: {} });
  if (rpc.method === "tools/list") return NextResponse.json({ jsonrpc: "2.0", id: rpc.id ?? null, result: { tools } });
  if (rpc.method !== "tools/call") return rpcError(rpc.id, -32601, "Method not found.");

  const params = rpc.params ?? {};
  const name = params.name;
  const args = (params.arguments && typeof params.arguments === "object" ? params.arguments : {}) as Record<string, unknown>;
  if (name === "search_x402_services") {
    const query = typeof args.query === "string" ? args.query.trim().slice(0, 400) : "";
    const network = typeof args.network === "string" ? args.network.trim() : "";
    if (query.length < 2 || (network && !/^(eip155:\d+|solana:[A-Za-z0-9]+)$/.test(network))) {
      return NextResponse.json({ jsonrpc: "2.0", id: rpc.id ?? null, result: { isError: true, content: [{ type: "text", text: "Provide a query of at least 2 characters and an optional valid CAIP-2 network." }] } });
    }
    try {
      const result = await searchCdpBazaar(query, network || undefined);
      return NextResponse.json({ jsonrpc: "2.0", id: rpc.id ?? null, result: { content: [{ type: "text", text: JSON.stringify(result) }] } });
    } catch (error) {
      const message = error instanceof Error && error.message === "CDP_NOT_CONFIGURED"
        ? "x402 Bazaar search is not configured on this server."
        : "Could not search x402 services right now.";
      return NextResponse.json({ jsonrpc: "2.0", id: rpc.id ?? null, result: { isError: true, content: [{ type: "text", text: message }] } });
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return rpcError(rpc.id, -32603, "Marketplace database is not configured.");
  const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  if (name === "search_marketplace") {
    const limitValue = Number(args.limit);
    const limit = Math.min(Math.max(Number.isInteger(limitValue) ? limitValue : 20, 1), 50);
    const requestedType = typeof args.type === "string" ? args.type.toLowerCase() : "all";
    const search = typeof args.query === "string" ? args.query.trim().replace(/[^\p{L}\p{N}\s_-]/gu, "") : "";
    if (!["all", "agent", "prompt", "tool", "mcp", "skill", "bundle"].includes(requestedType)) {
      return NextResponse.json({ jsonrpc: "2.0", id: rpc.id ?? null, result: { isError: true, content: [{ type: "text", text: "type must be all, agent, prompt, tool, mcp, skill, or bundle." }] } });
    }
    if (requestedType === "bundle") {
      let bundles = supabase.from("marketplace_bundles").select("id,name,description,image_url,price_usd,owner_id,is_free,created_at").eq("status", "published").order("created_at", { ascending: false }).limit(limit);
      if (search) bundles = bundles.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      const { data, error } = await bundles;
      if (error) return NextResponse.json({ jsonrpc: "2.0", id: rpc.id ?? null, result: { isError: true, content: [{ type: "text", text: "Could not search listings." }] } });
      const items = (data ?? []).map((item) => ({ ...item, user_id: item.owner_id, statusType: "bundle" }));
      return NextResponse.json({ jsonrpc: "2.0", id: rpc.id ?? null, result: { content: [{ type: "text", text: JSON.stringify({ items }) }] } });
    }
    let query = supabase.from("agents")
      .select("id,name,description,image_url,price_usd,is_free,user_id,created_at,statusType,token_address,token_symbol")
      .order("created_at", { ascending: false }).limit(limit);
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    if (requestedType !== "all") query = query.eq("statusType", requestedType);
    const { data, error } = await query;
    if (error) return NextResponse.json({ jsonrpc: "2.0", id: rpc.id ?? null, result: { isError: true, content: [{ type: "text", text: "Could not search listings." }] } });
    return NextResponse.json({ jsonrpc: "2.0", id: rpc.id ?? null, result: { content: [{ type: "text", text: JSON.stringify({ items: data ?? [] }) }] } });
  }

  if (name === "get_listing") {
    if (typeof args.id !== "string" || !args.id.trim()) return rpcError(rpc.id, -32602, "A listing id is required.");
    const { data, error } = await supabase.from("agents")
      .select("id,name,description,image_url,price_usd,is_free,user_id,owner_id,created_at,statusType,token_address,token_symbol")
      .eq("id", args.id).maybeSingle();
    if (error) return NextResponse.json({ jsonrpc: "2.0", id: rpc.id ?? null, result: { isError: true, content: [{ type: "text", text: "Could not load listing." }] } });
    if (!data) {
      const { data: bundle } = await supabase.from("marketplace_bundles").select("id,name,description,image_url,price_usd,owner_id,is_free,created_at").eq("id", args.id).eq("status", "published").maybeSingle();
      if (!bundle) return NextResponse.json({ jsonrpc: "2.0", id: rpc.id ?? null, result: { isError: true, content: [{ type: "text", text: "Listing not found." }] } });
      return NextResponse.json({ jsonrpc: "2.0", id: rpc.id ?? null, result: { content: [{ type: "text", text: JSON.stringify({ ...bundle, user_id: bundle.owner_id, statusType: "bundle" }) }] } });
    }
    const listing: Record<string, unknown> = {
      id: data.id, name: data.name, description: data.description, image_url: data.image_url,
      price_usd: data.price_usd, is_free: data.is_free, user_id: data.user_id, created_at: data.created_at,
      statusType: data.statusType, token_address: data.token_address, token_symbol: data.token_symbol,
    };
    const sourceColumn: Record<string, string> = { agent: "agent_code", prompt: "prompt_body", tool: "tool_code", skill: "skill_content" };
    const contentColumn = sourceColumn[String(data.statusType || "agent").toLowerCase()];
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (data.is_free && contentColumn && serviceKey) {
      const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: source } = await admin.from("agents").select(contentColumn).eq("id", data.id).maybeSingle();
      listing.content = source?.[contentColumn as keyof typeof source] ?? null;
    }
    return NextResponse.json({ jsonrpc: "2.0", id: rpc.id ?? null, result: { content: [{ type: "text", text: JSON.stringify(listing) }] } });
  }

  return NextResponse.json({ jsonrpc: "2.0", id: rpc.id ?? null, result: { isError: true, content: [{ type: "text", text: "Unknown tool." }] } });
}

export async function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}

export async function DELETE() {
  return new NextResponse(null, { status: 202 });
}
