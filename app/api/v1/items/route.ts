import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { recordApiKeyUsage } from "../record-key-usage";
import { checkApiKeyQuota } from "../../_lib/api-key-quota";

function publicListing(row: Record<string, unknown>) {
  // Read the installed table schema with `*` so optional columns added by later
  // migrations do not take down the marketplace. Keep this allowlist explicit:
  // agents also stores private executable and prompt source.
  return Object.fromEntries([
    "id", "name", "description", "image_url", "price_usd", "user_id", "is_free", "created_at",
    "statusType", "category", "tags", "language", "token_address", "token_symbol", "pool_address",
    "fee_selection", "vault_mode",
  ].filter((key) => key in row).map((key) => [key, row[key]]));
}

function missingBundlesTable(error: { code?: string; message?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205"
    || /marketplace_bundles.*(does not exist|schema cache)/i.test(error?.message ?? "");
}

export async function GET(request: Request) {
  const quota = await checkApiKeyQuota(request);
  if (quota.error) return quota.error;
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const requestedType = url.searchParams.get("type")?.trim().toLowerCase() || "all";
  const category = url.searchParams.get("category")?.trim();
  const language = url.searchParams.get("language")?.trim();
  const tag = url.searchParams.get("tag")?.trim();
  const free = url.searchParams.get("is_free");
  const minPrice = Number(url.searchParams.get("min_price"));
  const maxPrice = Number(url.searchParams.get("max_price"));
  const limit = Math.min(Math.max(Math.floor(Number(url.searchParams.get("limit")) || 20), 1), 100);
  const offset = Math.min(Math.max(Math.floor(Number(url.searchParams.get("offset")) || 0), 0), 5000);
  const validTypes = ["all", "agent", "prompt", "tool", "mcp", "skill", "bundle"];
  if (!validTypes.includes(requestedType)) {
    await recordApiKeyUsage(request, "GET", "/api/v1/items", 400);
    return NextResponse.json({ error: "type must be all, agent, prompt, tool, mcp, skill, or bundle." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return NextResponse.json({ error: "Marketplace data is not configured." }, { status: 503 });
  const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const safeQuery = query?.replace(/[^\p{L}\p{N}\s_-]/gu, "").trim();

  if (requestedType === "bundle") {
    let bundleQuery = supabase.from("marketplace_bundles")
      .select("id,name,description,image_url,price_usd,owner_id,is_free,created_at,category,tags,language", { count: "exact" })
      .eq("status", "published").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (safeQuery) bundleQuery = bundleQuery.or(`name.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`);
    if (free === "true" || free === "false") bundleQuery = bundleQuery.eq("is_free", free === "true");
    if (category) bundleQuery = bundleQuery.ilike("category", `%${category.replace(/[%_,]/g, " ")}%`);
    if (tag) bundleQuery = bundleQuery.contains("tags", [tag]);
    if (Number.isFinite(minPrice) && url.searchParams.has("min_price")) bundleQuery = bundleQuery.gte("price_usd", minPrice);
    if (Number.isFinite(maxPrice) && url.searchParams.has("max_price")) bundleQuery = bundleQuery.lte("price_usd", maxPrice);
    const { data, error, count } = await bundleQuery;
    await recordApiKeyUsage(request, "GET", "/api/v1/items", error ? 500 : 200);
    if (error && missingBundlesTable(error)) return NextResponse.json({ items: [], count: 0, limit, offset });
    if (error) return databaseError(error);
    return NextResponse.json({ items: (data ?? []).map((item) => ({ ...item, user_id: item.owner_id, statusType: "bundle" })), count: count ?? 0, limit, offset });
  }

  let itemQuery = supabase.from("agents").select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (requestedType !== "all") itemQuery = itemQuery.eq("statusType", requestedType);
  if (safeQuery) itemQuery = itemQuery.or(`name.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`);
  if (category) itemQuery = itemQuery.ilike("category", `%${category.replace(/[%_,]/g, " ")}%`);
  if (language) itemQuery = itemQuery.ilike("language", `%${language.replace(/[%_,]/g, " ")}%`);
  if (tag) itemQuery = itemQuery.contains("tags", [tag]);
  if (free === "true" || free === "false") itemQuery = itemQuery.eq("is_free", free === "true");
  if (Number.isFinite(minPrice) && url.searchParams.has("min_price")) itemQuery = itemQuery.gte("price_usd", minPrice);
  if (Number.isFinite(maxPrice) && url.searchParams.has("max_price")) itemQuery = itemQuery.lte("price_usd", maxPrice);

  if (requestedType !== "all") {
    const { data, error, count } = await itemQuery.range(offset, offset + limit - 1);
    await recordApiKeyUsage(request, "GET", "/api/v1/items", error ? 500 : 200);
    if (error) return databaseError(error);
    return NextResponse.json({ items: (data ?? []).map((row) => publicListing(row as Record<string, unknown>)), count: count ?? 0, limit, offset });
  }

  const mixedLimit = offset + limit;
  let bundleQuery = supabase.from("marketplace_bundles")
    .select("id,name,description,image_url,price_usd,owner_id,is_free,created_at,category,tags,language", { count: "exact" })
    .eq("status", "published").order("created_at", { ascending: false }).range(0, mixedLimit - 1);
  if (safeQuery) bundleQuery = bundleQuery.or(`name.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`);
  if (free === "true" || free === "false") bundleQuery = bundleQuery.eq("is_free", free === "true");
  if (category) bundleQuery = bundleQuery.ilike("category", `%${category.replace(/[%_,]/g, " ")}%`);
  if (tag) bundleQuery = bundleQuery.contains("tags", [tag]);
  if (Number.isFinite(minPrice) && url.searchParams.has("min_price")) bundleQuery = bundleQuery.gte("price_usd", minPrice);
  if (Number.isFinite(maxPrice) && url.searchParams.has("max_price")) bundleQuery = bundleQuery.lte("price_usd", maxPrice);
  const [itemResult, bundleResult] = await Promise.all([
    itemQuery.range(0, mixedLimit - 1), bundleQuery,
  ]);
  const usableBundleError = missingBundlesTable(bundleResult.error) ? null : bundleResult.error;
  const queryError = itemResult.error || usableBundleError;
  await recordApiKeyUsage(request, "GET", "/api/v1/items", queryError ? 500 : 200);
  if (queryError) return databaseError(queryError);

  const items = [
    ...(itemResult.data ?? []).map((row) => publicListing(row as Record<string, unknown>)),
    ...(bundleResult.data ?? []).map((item) => ({ ...item, user_id: item.owner_id, statusType: "bundle" })),
  ] as unknown as Array<{ created_at: string; [key: string]: unknown }>;
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const count = (itemResult.count ?? 0) + (missingBundlesTable(bundleResult.error) ? 0 : bundleResult.count ?? 0);
  return NextResponse.json({ items: items.slice(offset, offset + limit), count, limit, offset });
}

function databaseError(error: { message: string; code: string }) {
  return NextResponse.json({
    error: "Could not load marketplace items.",
    ...(process.env.NODE_ENV === "development" ? { detail: error.message, code: error.code } : {}),
  }, { status: 500 });
}
