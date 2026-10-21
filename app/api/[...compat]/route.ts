import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { checkApiKeyQuota } from "../_lib/api-key-quota";
import { hasHolderAccess } from "../_lib/holder-access";

type ListingType = "agent" | "prompt" | "tool";
type Listing = Record<string, any> & { id: string; statusType: string; is_free: boolean; owner_id?: string | null; publication_status?: string };

function clients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon) return null;
  return {
    public: createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }),
    admin: service ? createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } }) : null,
  };
}

async function keyOwner(request: Request, admin: SupabaseClient | null, endpoint: string) {
  const secret = request.headers.get("authorization")?.match(/^Bearer\s+(ssw_[\w-]+)$/i)?.[1];
  if (!secret || !admin) return null;
  const keyHash = createHash("sha256").update(secret).digest("hex");
  const { data: key } = await admin.from("marketplace_api_keys").select("id,owner_id")
    .eq("key_hash", keyHash).is("revoked_at", null).maybeSingle();
  if (!key) return null;
  await Promise.all([
    admin.from("marketplace_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id),
    admin.from("marketplace_api_usage").insert({ owner_id: key.owner_id, api_key_id: key.id, method: request.method, endpoint, status_code: 200 }),
  ]);
  return String(key.owner_id);
}

function text(value: unknown, max = 5000) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function csvTags(value: unknown) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 30);
  return text(value, 2000).split(",").map((item) => item.trim()).filter(Boolean).slice(0, 30);
}

function publicListing(row: Listing, includeContent = false, holderAccess = false) {
  const result: Record<string, unknown> = {
    id: row.id, name: row.name, description: row.vault_mode && row.token_address && !holderAccess ? undefined : row.description, image_url: row.image_url,
    price_usd: row.price_usd, user_id: row.user_id, is_free: row.is_free,
    created_at: row.created_at, statusType: row.statusType, category: row.category,
    tags: row.tags, language: row.language, useCases: row.use_cases, requirements: row.requirements,
    links: row.links, token_address: row.token_address, token_symbol: row.token_symbol,
    pool_address: row.pool_address, mcp_url: row.mcp_server_url, x402_url: row.x402_url,
  };
  if (includeContent) {
    const contentByType: Record<string, [string, string]> = {
      agent: ["agent_code", "agent"], prompt: ["prompt_body", "prompt"], tool: ["tool_code", "tool"],
    };
    const entry = contentByType[String(row.statusType).toLowerCase()];
    if (entry) result[entry[1]] = row[entry[0]] ?? "";
  }
  return result;
}

async function loadListing(admin: SupabaseClient, id: string, type?: ListingType): Promise<Listing | null> {
  let query = admin.from("agents").select("id,name,description,image_url,price_usd,user_id,owner_id,is_free,created_at,statusType,category,tags,language,token_address,token_symbol,pool_address,fee_selection,vault_mode,mcp_server_url,x402_url,requirements,use_cases,links,publication_status").eq("id", id);
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) query = admin.from("agents").select("*").eq("id", id);
  if (type) query = query.eq("statusType", type);
  const { data } = await query.maybeSingle();
  return data as Listing | null;
}

async function loadGatedDescription(admin: SupabaseClient | null, listing: Listing) {
  if (!admin || !listing.vault_mode || !listing.token_address) return;
  const { data } = await admin.from("marketplace_holder_gated_descriptions").select("description").eq("listing_id", listing.id).maybeSingle();
  if (data) listing.description = data.description;
}

async function entitled(request: Request, listing: Listing, admin: SupabaseClient | null, knownOwnerId?: string | null) {
  const ownerId = knownOwnerId !== undefined ? knownOwnerId : await keyOwner(request, admin, new URL(request.url).pathname);
  if (!ownerId) return false;
  if (listing.owner_id === ownerId) return true;
  if (listing.is_free) return true;
  if (!admin) return false;
  const { data } = await admin.from("marketplace_purchases").select("id")
    .eq("buyer_id", ownerId).eq("listing_id", listing.id).eq("status", "paid").maybeSingle();
  return Boolean(data);
}

async function listListings(request: Request, type: ListingType) {
  const configured = clients();
  if (!configured) return NextResponse.json({ error: "Marketplace database is not configured." }, { status: 503 });
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(params.get("limit")) || 20)));
  let query = configured.public.from("agents").select("id,name,description,image_url,price_usd,user_id,owner_id,is_free,created_at,statusType,category,tags,language,token_address,token_symbol,pool_address,fee_selection,vault_mode,mcp_server_url,requirements,use_cases,links", { count: "exact" })
    .eq("statusType", type).order("created_at", { ascending: false });
  const name = text(params.get("name"), 100);
  const category = text(params.get("category"), 80);
  const language = text(params.get("language"), 80);
  const tag = text(params.get("tag"), 60);
  const free = params.get("is_free");
  const minPrice = Number(params.get("min_price"));
  const maxPrice = Number(params.get("max_price"));
  if (name) query = query.ilike("name", `%${name.replace(/[%_,]/g, " ")}%`);
  if (category) query = query.ilike("category", `%${category.replace(/[%_,]/g, " ")}%`);
  if (language) query = query.ilike("language", `%${language.replace(/[%_,]/g, " ")}%`);
  if (tag) query = query.contains("tags", [tag]);
  if (free === "true" || free === "false") query = query.eq("is_free", free === "true");
  if (Number.isFinite(minPrice) && params.has("min_price")) query = query.gte("price_usd", minPrice);
  if (Number.isFinite(maxPrice) && params.has("max_price")) query = query.lte("price_usd", maxPrice);
  const { data, error, count } = await query.range((page - 1) * limit, page * limit - 1);
  if (error) return NextResponse.json({ error: "Could not load marketplace listings." }, { status: 500 });
  await keyOwner(request, configured.admin, new URL(request.url).pathname);
  return NextResponse.json({ success: true, data: (data ?? []).map((row) => publicListing(row as Listing)), total: count ?? 0, page, limit, has_more: (count ?? 0) > page * limit });
}

async function getListing(request: Request, type: ListingType, id: string, full: boolean) {
  const configured = clients();
  if (!configured) return NextResponse.json({ error: "Marketplace database is not configured." }, { status: 503 });
  const row = await loadListing(configured.admin ?? configured.public, id, type);
  if (!row) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (row.publication_status && row.publication_status !== "published") {
    const ownerId = await keyOwner(request, configured.admin, new URL(request.url).pathname);
    if (!ownerId || ownerId !== row.owner_id) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }
  const apiOwnerId = await keyOwner(request, configured.admin, new URL(request.url).pathname);
  const isOwner = Boolean(apiOwnerId && row.owner_id === apiOwnerId);
  const holderGated = Boolean(row.vault_mode && row.token_address);
  const holderAccess = !holderGated || isOwner || await hasHolderAccess(request, id, String(row.token_address));
  if (holderAccess && holderGated) await loadGatedDescription(configured.admin, row);
  const hasContent = holderAccess && (full ? (holderGated || await entitled(request, row, configured.admin, apiOwnerId)) : (row.is_free || holderGated));
  const item = publicListing(row, hasContent, holderAccess);
  if (!holderAccess) return NextResponse.json({ success: false, error: "A signed wallet holding this listing’s token is required.", data: { ...item, gated: true } }, { status: 403 });
  return NextResponse.json({ success: true, data: item });
}

async function publish(request: Request, type: ListingType) {
  const configured = clients();
  if (!configured?.admin) return NextResponse.json({ error: "Server-side marketplace credentials are not configured." }, { status: 503 });
  const ownerId = await keyOwner(request, configured.admin, new URL(request.url).pathname);
  if (!ownerId) return NextResponse.json({ error: "A valid Synthsynd API key is required." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
  if (body.tokenized_on || body.private_key || body.creator_private_key) return NextResponse.json({ error: "Token launch is not available through this endpoint. Do not send private keys." }, { status: 501 });
  const name = text(body.name, 120), description = text(body.description, 5000);
  const source = text(type === "agent" ? body.agent : type === "prompt" ? body.prompt : body.tool, 100000);
  if (name.length < 2 || !description) return NextResponse.json({ error: "name and description are required." }, { status: 400 });
  if (type !== "tool" && source.length < 5) return NextResponse.json({ error: `${type} content must contain at least 5 characters.` }, { status: 400 });
  const isFree = body.is_free !== false;
  const price = isFree ? 0 : Number(body.price_usd);
  if (!Number.isFinite(price) || price < 0 || (!isFree && price === 0)) return NextResponse.json({ error: "Paid listings need a positive price_usd." }, { status: 400 });
  const rawCategory = body.category;
  const category = Array.isArray(rawCategory) ? rawCategory.map((item) => text(item, 80)).filter(Boolean).join(", ") : text(rawCategory, 120);
  const row: Record<string, unknown> = {
    id: crypto.randomUUID(), owner_id: ownerId, user_id: text(body.seller_wallet_address, 128) || ownerId,
    name, description, image_url: text(body.image_url, 2000) || null, statusType: type,
    is_free: isFree, price_usd: price, category: category || null, language: text(body.language, 80) || null,
    tags: csvTags(body.tags), use_cases: Array.isArray(body.useCases) ? body.useCases.slice(0, 30) : [],
    requirements: Array.isArray(body.requirements) ? body.requirements.slice(0, 30) : [],
    links: Array.isArray(body.links) ? body.links.slice(0, 30) : [],
    ...(type === "agent" ? { agent_code: source } : {}),
    ...(type === "prompt" ? { prompt_body: source } : {}),
    ...(type === "tool" ? { tool_code: source } : {}),
    ...(text(body.mcp_url, 2000) ? { mcp_server_url: text(body.mcp_url, 2000) } : {}),
    ...(text(body.x402_url, 2000) ? { x402_url: text(body.x402_url, 2000) } : {}),
  };
  const { data, error } = await configured.admin.from("agents").insert(row).select("id").single();
  if (error) return NextResponse.json({ error: "Could not publish listing.", ...(process.env.NODE_ENV === "development" ? { detail: error.message } : {}) }, { status: 500 });
  const path = type === "agent" ? "agent" : type;
  return NextResponse.json({ success: true, id: data.id, listing_url: `${new URL(request.url).origin}/${path}/${data.id}`, tokenized: false, token_address: null, pool_address: null }, { status: 201 });
}

async function editListing(request: Request, type: ListingType) {
  const configured = clients();
  if (!configured?.admin) return NextResponse.json({ error: "Server-side marketplace credentials are not configured." }, { status: 503 });
  const ownerId = await keyOwner(request, configured.admin, new URL(request.url).pathname);
  if (!ownerId) return NextResponse.json({ error: "A valid Synthsynd API key is required." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
  const id = text(body.id, 50);
  const current = await loadListing(configured.admin, id, type);
  if (!current || current.owner_id !== ownerId) return NextResponse.json({ error: "Listing not found or not owned by this API key." }, { status: 404 });
  const update: Record<string, unknown> = {};
  for (const key of ["name", "description", "image_url", "category", "language"]) if (typeof body[key] === "string") update[key] = text(body[key], key === "description" ? 5000 : 1000) || null;
  if (typeof body.is_free === "boolean") update.is_free = body.is_free;
  if (body.price_usd !== undefined) update.price_usd = Number(body.price_usd);
  if (type === "agent" && typeof body.agent === "string") update.agent_code = text(body.agent, 100000);
  if (type === "prompt" && typeof body.prompt === "string") update.prompt_body = text(body.prompt, 100000);
  if (Array.isArray(body.tags) || typeof body.tags === "string") update.tags = csvTags(body.tags);
  if (typeof update.price_usd === "number" && (!Number.isFinite(update.price_usd) || update.price_usd < 0)) return NextResponse.json({ error: "price_usd must be a non-negative number." }, { status: 400 });
  const { error } = await configured.admin.from("agents").update(update).eq("id", id).eq("owner_id", ownerId);
  if (error) return NextResponse.json({ error: "Could not update listing." }, { status: 500 });
  return NextResponse.json({ success: true, id });
}

async function attachTokenAddress(request: Request) {
  const configured = clients();
  if (!configured?.admin) return NextResponse.json({ error: "Server-side marketplace credentials are not configured." }, { status: 503 });
  const ownerId = await keyOwner(request, configured.admin, new URL(request.url).pathname);
  if (!ownerId) return NextResponse.json({ error: "A valid Synthsynd API key is required." }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
  const id = text(body.id ?? body.listingId, 50);
  const tokenAddress = text(body.tokenAddress ?? body.token_address, 64);
  const tokenSymbol = text(body.tokenSymbol ?? body.token_symbol, 10).toUpperCase();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !tokenAddress) return NextResponse.json({ error: "A valid listing id and token address are required." }, { status: 400 });
  try { new PublicKey(tokenAddress); } catch { return NextResponse.json({ error: "tokenAddress must be a valid Solana public key." }, { status: 400 }); }
  if (tokenSymbol && !/^[A-Z0-9]{2,10}$/.test(tokenSymbol)) return NextResponse.json({ error: "tokenSymbol must contain 2–10 letters or numbers." }, { status: 400 });

  const { data: listing, error: lookupError } = await configured.admin.from("agents")
    .select("id,owner_id,token_address").eq("id", id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Could not verify listing ownership. Apply the marketplace migrations first." }, { status: 500 });
  if (!listing || listing.owner_id !== ownerId) return NextResponse.json({ error: "Listing not found or not owned by this API key." }, { status: 404 });
  if (listing.token_address) return NextResponse.json({ error: "This listing already has a token address." }, { status: 409 });

  const update = tokenSymbol ? { token_address: tokenAddress, token_symbol: tokenSymbol } : { token_address: tokenAddress };
  const { data, error } = await configured.admin.from("agents").update(update).eq("id", id).eq("owner_id", ownerId)
    .is("token_address", null).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not attach the token address. Confirm the token metadata migrations are applied." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Listing changed during the request. Refresh and try again." }, { status: 409 });
  return NextResponse.json({ success: true, id, token_address: tokenAddress, token_symbol: tokenSymbol || null });
}

export async function GET(request: Request, { params }: { params: Promise<{ compat: string[] }> }) {
  const quota = await checkApiKeyQuota(request);
  if (quota.error) return quota.error;
  const path = (await params).compat;
  const [resource, id, suffix] = path;
  if (["get-agents", "get-prompts", "get-tools"].includes(resource)) {
    const type = resource === "get-agents" ? "agent" : resource === "get-prompts" ? "prompt" : "tool";
    if (!id) return listListings(request, type);
    const full = suffix === "full";
    if (id === "fetch-agent-count" || id === "fetch-prompt-count") {
      const configured = clients();
      if (!configured?.admin) return NextResponse.json({ error: "Server-side marketplace credentials are not configured." }, { status: 503 });
      const ownerId = await keyOwner(request, configured.admin, new URL(request.url).pathname);
      if (!ownerId) return NextResponse.json({ error: "A valid Synthsynd API key is required." }, { status: 401 });
      const { count } = await configured.admin.from("agents").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("statusType", type);
      return NextResponse.json({ success: true, count: count ?? 0 });
    }
    return getListing(request, type, id, full);
  }
  if (resource === "reviews") {
    const configured = clients();
    if (!configured) return NextResponse.json({ error: "Marketplace database is not configured." }, { status: 503 });
    const idValue = new URL(request.url).searchParams.get("model_id");
    if (!idValue) return NextResponse.json({ error: "model_id is required." }, { status: 400 });
    const { data, error } = await configured.public.from("marketplace_reviews").select("id,listing_id,reviewer_id,rating,comment,created_at").eq("listing_id", idValue).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Could not load reviews." }, { status: 500 });
    const reviews = data ?? [];
    const average = reviews.length ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length : 0;
    return NextResponse.json({ success: true, data: reviews, rating: Number(average.toFixed(2)), count: reviews.length });
  }
  if (resource === "prompt-raw" && id) {
    const configured = clients();
    if (!configured) return NextResponse.json({ error: "Marketplace database is not configured." }, { status: 503 });
    const row = await loadListing(configured.admin ?? configured.public, id, "prompt");
    if (!row) return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
    if (row.publication_status && row.publication_status !== "published") {
      const ownerId = await keyOwner(request, configured.admin, new URL(request.url).pathname);
      if (!ownerId || ownerId !== row.owner_id) return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
    }
    const ownerId = await keyOwner(request, configured.admin, new URL(request.url).pathname);
    const isOwner = Boolean(ownerId && ownerId === row.owner_id);
    const holderGated = Boolean(row.vault_mode && row.token_address);
    const holderAccess = !holderGated || isOwner || await hasHolderAccess(request, id, String(row.token_address));
    if (holderAccess && holderGated) await loadGatedDescription(configured.admin, row);
    const allowed = holderAccess && (holderGated || row.is_free || await entitled(request, row, configured.admin, ownerId));
    if (!allowed) return NextResponse.json({ error: "Purchase this prompt or use an API key for an account with access." }, { status: 403 });
    const prompt = typeof row.prompt_body === "string" ? row.prompt_body : "";
    if (!prompt) return NextResponse.json({ error: "Prompt content is unavailable." }, { status: 404 });
    const publiclyCacheable = !holderGated && row.is_free && (!row.publication_status || row.publication_status === "published");
    return new Response(`---\nname: ${JSON.stringify(row.name)}\nlisting_id: ${row.id}\n---\n\n${prompt}`, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": publiclyCacheable ? "public, max-age=60" : "private, no-store" } });
  }
  if (resource === "product" && id === "fees") return NextResponse.json({ error: "On-chain creator-fee accounting is unavailable until the token launch/indexing integration is configured." }, { status: 501 });
  if (resource === "search") return searchListings(request);
  if (resource === "product" && id === "list") return userProducts(request);
  if (resource === "get-tokenized-products") return listTokenized(request);
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}

async function searchListings(request: Request) {
  const configured = clients();
  if (!configured) return NextResponse.json({ error: "Marketplace database is not configured." }, { status: 503 });
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  const queryText = text(params.get("q"), 100);
  if (id) {
    const row = await loadListing(configured.admin ?? configured.public, id);
    if (!row) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    if (row.publication_status && row.publication_status !== "published") {
      const ownerId = await keyOwner(request, configured.admin, new URL(request.url).pathname);
      if (!ownerId || ownerId !== row.owner_id) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }
    const includeContent = params.get("include_content") === "true";
    const keyUser = await keyOwner(request, configured.admin, new URL(request.url).pathname);
    const isOwner = Boolean(keyUser && keyUser === row.owner_id);
    const holderGated = Boolean(row.vault_mode && row.token_address);
    const holderAccess = !holderGated || isOwner || await hasHolderAccess(request, id, String(row.token_address));
    const hasAccess = holderAccess && (holderGated || row.is_free || (includeContent && await entitled(request, row, configured.admin, keyUser)));
    const item = publicListing(row, includeContent && hasAccess, holderAccess);
    if (!holderAccess) return NextResponse.json({ success: false, data: { ...item, gated: true }, access: { has_access: false, reason: "token_holder_required" } }, { status: 403 });
    return NextResponse.json({ success: true, data: item, access: { has_access: hasAccess, reason: hasAccess ? (holderGated ? "token_holder" : "free_or_entitled") : "purchase_required" } });
  }
  let query = configured.public.from("agents").select("id,name,description,image_url,price_usd,user_id,owner_id,is_free,created_at,statusType,category,tags,language,token_address,token_symbol,vault_mode", { count: "exact" }).order("created_at", { ascending: false }).limit(50);
  if (queryText) query = query.or(`name.ilike.%${queryText.replace(/[%_,]/g, " ")}%,description.ilike.%${queryText.replace(/[%_,]/g, " ")}%`);
  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: "Could not search listings." }, { status: 500 });
  let bundleQuery = configured.public.from("marketplace_bundles").select("id,name,description,image_url,price_usd,owner_id,is_free,created_at", { count: "exact" }).eq("status", "published").order("created_at", { ascending: false }).limit(50);
  if (queryText) bundleQuery = bundleQuery.or(`name.ilike.%${queryText.replace(/[%_,]/g, " ")}%,description.ilike.%${queryText.replace(/[%_,]/g, " ")}%`);
  const { data: bundles } = await bundleQuery;
  const output = [...(data ?? []).map((row) => publicListing(row as Listing)), ...(bundles ?? []).map((item) => ({ ...item, user_id: item.owner_id, statusType: "bundle" }))];
  return NextResponse.json({ success: true, data: output, total: (count ?? 0) + (bundles?.length ?? 0), access: { has_access: false, reason: "Use a listing detail endpoint to check source access." } });
}

async function userProducts(request: Request) {
  const configured = clients();
  if (!configured?.admin) return NextResponse.json({ error: "Server-side marketplace credentials are not configured." }, { status: 503 });
  const ownerId = await keyOwner(request, configured.admin, new URL(request.url).pathname);
  if (!ownerId) return NextResponse.json({ error: "A valid Synthsynd API key is required." }, { status: 401 });
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* endpoint allows empty body */ }
  const productType = text(body.product_type, 20) || "all";
  let query = configured.admin.from("agents").select("id,name,description,image_url,price_usd,is_free,created_at,statusType,category,tags", { count: "exact" }).eq("owner_id", ownerId).order("created_at", { ascending: false });
  if (["agents", "prompts", "tools"].includes(productType)) query = query.eq("statusType", productType.replace(/s$/, ""));
  const page = Math.max(1, Number(body.page) || 1), limit = Math.min(100, Math.max(1, Number(body.limit) || 20));
  const { data, error, count } = await query.range((page - 1) * limit, page * limit - 1);
  if (error) return NextResponse.json({ error: "Could not load products." }, { status: 500 });
  return NextResponse.json({ success: true, data: data ?? [], total: count ?? 0, page, limit, has_more: (count ?? 0) > page * limit });
}

async function listTokenized(request: Request) {
  const configured = clients();
  if (!configured) return NextResponse.json({ error: "Marketplace database is not configured." }, { status: 503 });
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1), limit = Math.min(500, Math.max(1, Number(params.get("limit")) || 50));
  const { data, error, count } = await configured.public.from("agents").select("id,name,description,image_url,user_id,owner_id,is_free,statusType,token_address,token_symbol,pool_address,vault_mode,created_at", { count: "exact" }).not("token_address", "is", null).order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1);
  if (error) return NextResponse.json({ error: "Could not load tokenized listings." }, { status: 500 });
  return NextResponse.json({ success: true, data: (data ?? []).map((row) => publicListing(row as Listing)), total: count ?? 0, page, limit, has_more: (count ?? 0) > page * limit });
}

export async function POST(request: Request, { params }: { params: Promise<{ compat: string[] }> }) {
  const quota = await checkApiKeyQuota(request);
  if (quota.error) return quota.error;
  const [resource, id] = (await params).compat;
  if (resource === "add-agent") return publish(request, "agent");
  if (resource === "add-prompt") return publish(request, "prompt");
  if (resource === "edit-agent") return editListing(request, "agent");
  if (resource === "edit-prompt") return editListing(request, "prompt");
  if (resource === "update-token-address") return attachTokenAddress(request);
  if (resource === "user-products") return userProducts(request);
  if (resource === "query-agents" || resource === "query-prompts") {
    let body: Record<string, unknown> = {};
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
    const type = resource === "query-agents" ? "agent" : "prompt";
    const key = ["agent_id", "prompt_id", "id"].map((key) => body[key]).find((value) => typeof value === "string") as string | undefined;
    if (key) return getListing(request, type, key, false);
    const configured = clients();
    if (!configured) return NextResponse.json({ error: "Marketplace database is not configured." }, { status: 503 });
    let query = configured.public.from("agents").select("id,name,description,image_url,price_usd,user_id,is_free,created_at,statusType,category,tags,language").eq("statusType", type).limit(50);
    if (typeof body.username === "string") {
      const { data: profile } = await configured.public.from("marketplace_profiles").select("owner_id").eq("username", text(body.username, 24)).maybeSingle();
      if (!profile) return NextResponse.json({ success: true, data: [] });
      query = query.eq("owner_id", profile.owner_id);
    } else if (typeof body.agent_name === "string" || typeof body.prompt_name === "string") query = query.ilike("name", `%${text(body.agent_name ?? body.prompt_name, 100).replace(/[%_,]/g, " ")}%`);
    const { data, error } = await query.order("created_at", { ascending: false });
    return error ? NextResponse.json({ error: "Could not query listings." }, { status: 500 }) : NextResponse.json({ success: true, data: data ?? [] });
  }
  if (resource === "reviews") return submitReview(request);
  if (resource === "product" && id === "claimfees") return NextResponse.json({ error: "Fee claims require wallet-signed transactions; private keys are never accepted by this API." }, { status: 501 });
  if (resource === "v1" && id === "publish" && (await params).compat[2] === "bundle") return publishBundle(request);
  if (resource === "mcp") return NextResponse.json({ error: "Use the MCP JSON-RPC endpoint at /mcp." }, { status: 308, headers: { Location: "/mcp" } });
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}

async function publishBundle(request: Request) {
  const configured = clients();
  if (!configured?.admin) return NextResponse.json({ error: "Server-side marketplace credentials are not configured." }, { status: 503 });
  const ownerId = await keyOwner(request, configured.admin, new URL(request.url).pathname);
  if (!ownerId) return NextResponse.json({ error: "A valid Synthsynd API key is required." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
  const name = text(body.name, 120), description = text(body.description, 5000);
  if (name.length < 2 || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) return NextResponse.json({ error: "A bundle needs a name and between 1 and 50 items." }, { status: 400 });
  const isFree = body.is_free !== false;
  const price = isFree ? 0 : Number(body.price_usd);
  if (!isFree && (!Number.isFinite(price) || price <= 0)) return NextResponse.json({ error: "Paid bundles need a positive price_usd." }, { status: 400 });
  const bundleId = crypto.randomUUID();
  const { error: bundleError } = await configured.admin.from("marketplace_bundles").insert({ id: bundleId, owner_id: ownerId, name, description, image_url: text(body.image_url, 2000) || null, is_free: isFree, price_usd: price, category: text(body.category, 100) || null, tags: csvTags(body.tags) });
  if (bundleError) return NextResponse.json({ error: "Could not create bundle." }, { status: 500 });
  const itemIds: string[] = [];
  for (const candidate of body.items) {
    if (typeof candidate === "string") {
      const id = candidate.match(/[0-9a-f-]{36}/i)?.[0];
      if (id) itemIds.push(id);
    } else if (candidate && typeof candidate === "object") {
      const entry = candidate as Record<string, unknown>;
      const id = text(entry.id ?? entry.url, 500).match(/[0-9a-f-]{36}/i)?.[0];
      if (id) itemIds.push(id);
      else if (typeof entry.prompt === "string" && text(entry.prompt, 100000).length >= 5) {
        const inlineId = crypto.randomUUID();
        const { error } = await configured.admin.from("agents").insert({ id: inlineId, owner_id: ownerId, user_id: ownerId, statusType: "prompt", name: text(entry.name, 120) || `${name} prompt`, description: text(entry.description, 3000), prompt_body: text(entry.prompt, 100000), is_free: isFree, price_usd: isFree ? 0 : price, created_at: new Date().toISOString() });
        if (error) { await configured.admin.from("marketplace_bundles").delete().eq("id", bundleId); return NextResponse.json({ error: "Could not create an inline prompt in the bundle." }, { status: 500 }); }
        itemIds.push(inlineId);
      }
    }
  }
  const uniqueIds = [...new Set(itemIds)];
  if (!uniqueIds.length) { await configured.admin.from("marketplace_bundles").delete().eq("id", bundleId); return NextResponse.json({ error: "No valid listing IDs or inline prompts were supplied." }, { status: 400 }); }
  const { data: existing } = await configured.admin.from("agents").select("id").in("id", uniqueIds);
  const validIds = (existing ?? []).map((item) => item.id);
  const { error: linkError } = await configured.admin.from("marketplace_bundle_items").insert(validIds.map((item_id, position) => ({ bundle_id: bundleId, item_id, position })));
  if (linkError || !validIds.length) { await configured.admin.from("marketplace_bundles").delete().eq("id", bundleId); return NextResponse.json({ error: "Could not add the bundle listings." }, { status: 500 }); }
  const origin = new URL(request.url).origin;
  return NextResponse.json({ success: true, id: bundleId, listing_url: `${origin}/bundle/${bundleId}`, tokenized: false, token_address: null, pool_address: null }, { status: 201 });
}

async function submitReview(request: Request) {
  const configured = clients();
  if (!configured?.admin) return NextResponse.json({ error: "Server-side marketplace credentials are not configured." }, { status: 503 });
  const ownerId = await keyOwner(request, configured.admin, new URL(request.url).pathname);
  if (!ownerId) return NextResponse.json({ error: "A valid Synthsynd API key is required." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
  const id = text(body.model_id ?? body.listing_id, 50), rating = Number(body.rating), comment = text(body.comment, 3000);
  if (!id || !Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) return NextResponse.json({ error: "model_id, rating (1–5), and comment are required." }, { status: 400 });
  const { data, error } = await configured.admin.from("marketplace_reviews").upsert({ listing_id: id, reviewer_id: ownerId, rating, comment, updated_at: new Date().toISOString() }, { onConflict: "listing_id,reviewer_id" }).select("id,listing_id,rating,comment,created_at").single();
  if (error) return NextResponse.json({ error: "Could not save review." }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

export async function PUT(request: Request, context: { params: Promise<{ compat: string[] }> }) { return POST(request, context); }
export async function DELETE(request: Request, { params }: { params: Promise<{ compat: string[] }> }) {
  const quota = await checkApiKeyQuota(request);
  if (quota.error) return quota.error;
  const [resource, id] = (await params).compat;
  if (resource !== "reviews" || !id) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const configured = clients();
  if (!configured?.admin) return NextResponse.json({ error: "Server-side marketplace credentials are not configured." }, { status: 503 });
  const ownerId = await keyOwner(request, configured.admin, new URL(request.url).pathname);
  if (!ownerId) return NextResponse.json({ error: "A valid Synthsynd API key is required." }, { status: 401 });
  const { error } = await configured.admin.from("marketplace_reviews").delete().eq("id", id).eq("reviewer_id", ownerId);
  return error ? NextResponse.json({ error: "Could not delete review." }, { status: 500 }) : NextResponse.json({ success: true });
}
