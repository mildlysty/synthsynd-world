import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";

type JupiterToken = {
  id: string; usdPrice?: number; mcap?: number; liquidity?: number; holderCount?: number;
  isVerified?: boolean; organicScore?: number; stats24h?: { priceChange?: number; buyVolume?: number; sellVolume?: number; numTraders?: number };
};

const cached = { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } };

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "Marketplace data is not configured." }, { status: 503 });
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: listings, error } = await supabase.from("agents")
    .select("id,name,statusType,token_address,created_at")
    .not("token_address", "is", null).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({
    error: "Could not load tokenized listings.",
    ...(process.env.NODE_ENV === "development" ? { detail: error.message, code: error.code, hint: error.hint } : {}),
  }, { status: 500 });
  const validListings = (listings ?? []).filter(item => {
    try { new PublicKey(item.token_address); return true; } catch { return false; }
  });
  if (!validListings.length) return NextResponse.json({ items: [], provider: "Jupiter Tokens V2", updatedAt: new Date().toISOString() }, cached);

  const apiKey = process.env.JUPITER_API_KEY || process.env.JUPITER_STUDIO_API_KEY;
  const upstream = await fetch(`https://api.jup.ag/tokens/v2/search?query=${validListings.map(item => item.token_address).join(",")}`, {
    headers: apiKey ? { "x-api-key": apiKey } : {},
    next: { revalidate: 30 }, signal: AbortSignal.timeout(20_000),
  });
  const tokens = await upstream.json().catch(() => null);
  if (!upstream.ok || !Array.isArray(tokens)) return NextResponse.json({ error: "Jupiter token market data is temporarily unavailable." }, { status: 502 });
  const byMint = new Map<string, JupiterToken>(tokens.map((token: JupiterToken) => [token.id, token]));
  const items = validListings.map(item => {
    const token = byMint.get(item.token_address);
    const stats = token?.stats24h;
    return {
      ...item, usdPrice: token?.usdPrice ?? null, priceChange24h: stats?.priceChange ?? null,
      marketCapUsd: token?.mcap ?? null,
      volume24hUsd: stats && Number.isFinite(stats.buyVolume) && Number.isFinite(stats.sellVolume) ? (stats.buyVolume || 0) + (stats.sellVolume || 0) : null,
      traders24h: stats?.numTraders ?? null, liquidityUsd: token?.liquidity ?? null,
      holderCount: token?.holderCount ?? null, organicScore: token?.organicScore ?? null,
      verified: token?.isVerified ?? null, marketDataAvailable: Boolean(token),
    };
  });
  return NextResponse.json({ items, provider: "Jupiter Tokens V2", updatedAt: new Date().toISOString() }, cached);
}
