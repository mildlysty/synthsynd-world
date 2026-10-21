import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getAuthenticatedSupabase } from "../../_lib/auth";

const studio = "https://api.jup.ag/studio/v1";

async function ownerListing(request: Request, listingId: string) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return { response: NextResponse.json({ error: "Sign in to view creator fees." }, { status: 401 }) };
  const { data, error } = await auth.supabase.from("agents")
    .select("id,name,token_address,token_creator_wallet,owner_id")
    .eq("id", listingId).eq("owner_id", auth.user.id).maybeSingle();
  if (error) return { response: NextResponse.json({ error: "Could not load your token listing. Apply the token migrations first." }, { status: 500 }) };
  if (!data?.token_address || !data.token_creator_wallet) return { response: NextResponse.json({ error: "This listing has no registered token creator wallet." }, { status: 404 }) };
  return { auth, listing: data };
}

async function feeState(apiKey: string, mint: string) {
  const addressesResponse = await fetch(`${studio}/dbc-pool/addresses/${encodeURIComponent(mint)}`, {
    headers: { "x-api-key": apiKey }, signal: AbortSignal.timeout(20_000), cache: "no-store",
  });
  const addresses = await addressesResponse.json().catch(() => null);
  const poolAddress = addresses?.data?.dbcPoolAddress;
  if (!addressesResponse.ok || typeof poolAddress !== "string") throw new Error("Jupiter could not resolve the token's bonding-curve pool.");
  const feesResponse = await fetch(`${studio}/dbc/fee`, {
    method: "POST", headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ poolAddress }), signal: AbortSignal.timeout(20_000), cache: "no-store",
  });
  const fees = await feesResponse.json().catch(() => null);
  if (!feesResponse.ok || typeof fees?.unclaimed !== "string" || typeof fees?.total !== "string") throw new Error("Jupiter could not return creator-fee balances.");
  return { poolAddress, unclaimed: fees.unclaimed, total: fees.total };
}

export async function GET(request: Request) {
  const listingId = new URL(request.url).searchParams.get("listingId") || "";
  if (!listingId) {
    const auth = await getAuthenticatedSupabase(request);
    if (!auth) return NextResponse.json({ error: "Sign in to view creator fees." }, { status: 401 });
    const apiKey = process.env.JUPITER_API_KEY || process.env.JUPITER_STUDIO_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Jupiter Studio is not configured." }, { status: 503 });
    const { data: listings, error } = await auth.supabase.from("agents")
      .select("id,name,token_address,token_creator_wallet,owner_id")
      .eq("owner_id", auth.user.id).not("token_address", "is", null).order("created_at", { ascending: false }).limit(100);
    if (error) return NextResponse.json({ error: "Could not load your token listings. Apply the token migrations first." }, { status: 500 });
    const items: Array<{ listingId: string; name: string; mint: string; creatorWallet: string | null; poolAddress?: string; unclaimed?: string; total?: string; quoteDecimals?: number; error?: string }> = [];
    for (let offset = 0; offset < (listings ?? []).length; offset += 8) {
      const batch = await Promise.all((listings ?? []).slice(offset, offset + 8).map(async (listing) => {
        try {
          const fees = await feeState(apiKey, listing.token_address);
          return { listingId: listing.id, name: listing.name, mint: listing.token_address, creatorWallet: listing.token_creator_wallet, poolAddress: fees.poolAddress, unclaimed: fees.unclaimed, total: fees.total, quoteDecimals: 6 };
        } catch (cause) {
          return { listingId: listing.id, name: listing.name, mint: listing.token_address, creatorWallet: listing.token_creator_wallet, error: cause instanceof Error ? cause.message : "Creator fees are unavailable." };
        }
      }));
      items.push(...batch);
    }
    const valid = items.filter((item): item is typeof item & { unclaimed: string; total: string; quoteDecimals: number } => "unclaimed" in item && "total" in item);
    const sum = (field: "unclaimed" | "total") => valid.reduce((total, item) => total + BigInt(item[field]), BigInt(0)).toString();
    return NextResponse.json({ ownerId: auth.user.id, items, unclaimed: sum("unclaimed"), total: sum("total"), quoteDecimals: 6 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(listingId)) return NextResponse.json({ error: "A valid listingId is required." }, { status: 400 });
  const ctx = await ownerListing(request, listingId);
  if ("response" in ctx) return ctx.response;
  const apiKey = process.env.JUPITER_API_KEY || process.env.JUPITER_STUDIO_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Jupiter Studio is not configured." }, { status: 503 });
  try {
    const fees = await feeState(apiKey, ctx.listing.token_address);
    return NextResponse.json({ listingId, mint: ctx.listing.token_address, poolAddress: fees.poolAddress, unclaimed: fees.unclaimed, total: fees.total, quoteDecimals: 6 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Creator fees are unavailable." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.JUPITER_API_KEY || process.env.JUPITER_STUDIO_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Jupiter Studio is not configured." }, { status: 503 });
  let body: { listingId?: unknown; ownerWallet?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
  const listingId = typeof body.listingId === "string" ? body.listingId : "";
  const ownerWallet = typeof body.ownerWallet === "string" ? body.ownerWallet : "";
  if (!/^[0-9a-f-]{36}$/i.test(listingId)) return NextResponse.json({ error: "A valid listingId is required." }, { status: 400 });
  try { new PublicKey(ownerWallet); } catch { return NextResponse.json({ error: "Connect a valid Solana wallet." }, { status: 400 }); }
  const ctx = await ownerListing(request, listingId);
  if ("response" in ctx) return ctx.response;
  if (ctx.listing.token_creator_wallet !== ownerWallet) return NextResponse.json({ error: "Connect the wallet that created this token." }, { status: 403 });
  try {
    const fees = await feeState(apiKey, ctx.listing.token_address);
    const raw = BigInt(fees.unclaimed);
    if (raw <= BigInt(0)) return NextResponse.json({ error: "There are no unclaimed creator fees." }, { status: 409 });
    if (raw > BigInt(Number.MAX_SAFE_INTEGER)) return NextResponse.json({ error: "Fee amount exceeds the provider's safe numeric claim limit." }, { status: 409 });
    const response = await fetch(`${studio}/dbc/fee/create-tx`, {
      method: "POST", headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ ownerWallet, poolAddress: fees.poolAddress, maxQuoteAmount: Number(raw) }),
      signal: AbortSignal.timeout(20_000), cache: "no-store",
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || typeof result?.transaction !== "string") return NextResponse.json({ error: typeof result?.error === "string" ? result.error : "Jupiter could not build a fee-claim transaction." }, { status: 502 });
    return NextResponse.json({ transaction: result.transaction, unclaimed: fees.unclaimed, poolAddress: fees.poolAddress });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not prepare creator-fee claim." }, { status: 502 });
  }
}
