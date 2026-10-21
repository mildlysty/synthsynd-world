import { createCdpJwt } from "../../_lib/cdp-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CacheEntry = { expiresAt: number; body: unknown };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

function clean(value: string | null, max = 200) {
  return (value ?? "").trim().slice(0, max);
}

export async function GET(request: Request) {
  const keyId = process.env.CDP_API_KEY_ID;
  const keySecret = process.env.CDP_API_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({
      error: "x402 Bazaar discovery requires CDP_API_KEY_ID and CDP_API_KEY_SECRET on the server.",
      code: "CDP_NOT_CONFIGURED",
    }, { status: 503 });
  }

  const incoming = new URL(request.url).searchParams;
  const query = clean(incoming.get("query"), 400);
  const mode = query ? "search" : "resources";
  const params = new URLSearchParams();
  const defaultLimit = mode === "search" ? 20 : 100;
  const limit = Math.min(mode === "search" ? 20 : 100, Math.max(1, Math.floor(Number(incoming.get("limit")) || defaultLimit)));
  params.set("limit", String(limit));
  if (mode === "resources") {
    const offset = Math.min(100_000, Math.max(0, Math.floor(Number(incoming.get("offset")) || 0)));
    params.set("offset", String(offset));
    const type = clean(incoming.get("type"), 12);
    if (type === "http") params.set("type", type);
  } else {
    params.set("query", query);
    for (const name of ["network", "asset", "scheme", "payTo", "urlSubstring", "maxUsdPrice"]) {
      const value = clean(incoming.get(name), 2048);
      if (value) params.set(name, value);
    }
    for (const extension of incoming.getAll("extensions").slice(0, 5)) {
      const value = clean(extension, 40);
      if (/^[a-z0-9_-]+$/i.test(value)) params.append("extensions", value);
    }
  }

  const path = `/platform/v2/x402/discovery/${mode}`;
  const url = `https://api.cdp.coinbase.com${path}?${params.toString()}`;
  const cacheKey = `${mode}:${params.toString()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.body, { headers: { "Cache-Control": "private, max-age=15" } });
  }

  try {
    const token = createCdpJwt(keyId, keySecret, "GET", path);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("CDP x402 discovery returned an error", response.status);
      return NextResponse.json({ error: "The x402 Bazaar could not return resources right now." }, { status: response.status >= 500 ? 502 : response.status });
    }
    const catalogRows = mode === "search" ? (body as { resources?: unknown } | null)?.resources : (body as { items?: unknown } | null)?.items;
    if (!body || typeof body !== "object" || !Array.isArray(catalogRows)) return NextResponse.json({ error: "The x402 Bazaar returned an invalid catalog response." }, { status: 502 });
    cache.set(cacheKey, { body, expiresAt: Date.now() + CACHE_TTL_MS });
    if (cache.size > 100) {
      for (const [entryKey, entry] of cache) if (entry.expiresAt <= Date.now()) cache.delete(entryKey);
      if (cache.size > 100) cache.delete(cache.keys().next().value!);
    }
    return NextResponse.json(body, { headers: { "Cache-Control": "private, max-age=15" } });
  } catch (error) {
    console.error("CDP x402 discovery request failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not connect to the x402 Bazaar." }, { status: 502 });
  }
}
