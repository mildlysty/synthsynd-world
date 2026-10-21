import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getAuthenticatedSupabase } from "../../../_lib/auth";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const imageTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Sign in to launch a token for your listing." }, { status: 401 });
  const apiKey = process.env.JUPITER_API_KEY || process.env.JUPITER_STUDIO_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Jupiter is not configured. Set JUPITER_API_KEY on the server." }, { status: 503 });
  let body: { listingId?: unknown; ownerWallet?: unknown; tokenSymbol?: unknown; feeSelection?: unknown; imageContentType?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
  const listingId = typeof body.listingId === "string" ? body.listingId : "";
  const ownerWallet = typeof body.ownerWallet === "string" ? body.ownerWallet : "";
  const tokenSymbol = typeof body.tokenSymbol === "string" ? body.tokenSymbol.trim().toUpperCase() : "";
  const feeSelection = body.feeSelection === "frenzy" ? "frenzy" : body.feeSelection === "market" ? "market" : "";
  const imageContentType = typeof body.imageContentType === "string" ? body.imageContentType : "";
  if (!/^[0-9a-f-]{36}$/i.test(listingId) || !feeSelection || !/^[A-Z0-9]{2,10}$/.test(tokenSymbol) || !imageTypes.has(imageContentType)) return NextResponse.json({ error: "Provide a listing, 2–10 character ticker, supported image type, and fee mode." }, { status: 400 });
  try { new PublicKey(ownerWallet); } catch { return NextResponse.json({ error: "Connect a valid Solana wallet." }, { status: 400 }); }
  const { data: listing, error } = await auth.supabase.from("agents").select("id,name,description,owner_id,token_address")
    .eq("id", listingId).eq("owner_id", auth.user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load your listing." }, { status: 500 });
  if (!listing) return NextResponse.json({ error: "Listing not found or not owned by this account." }, { status: 404 });
  if (listing.token_address) return NextResponse.json({ error: "This listing already has a token." }, { status: 409 });

  const requestBody = {
    buildCurveByMarketCapParam: {
      quoteMint: USDC,
      initialMarketCap: 16000,
      migrationMarketCap: 69000,
      tokenQuoteDecimal: 6,
      lockedVestingParam: { totalLockedVestingAmount: 0, cliffUnlockAmount: 0, numberOfVestingPeriod: 0, totalVestingDuration: 0, cliffDurationFromMigrationTime: 0 },
    },
    antiSniping: true,
    fee: { feeBps: feeSelection === "frenzy" ? 200 : 100 },
    isLpLocked: true,
    tokenName: String(listing.name).slice(0, 32),
    tokenSymbol,
    tokenImageContentType: imageContentType,
    creator: ownerWallet,
  };
  try {
    const response = await fetch("https://api.jup.ag/studio/v1/dbc-pool/create-tx", {
      method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(requestBody), signal: AbortSignal.timeout(30_000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const details = typeof result?.details === "string"
        ? result.details
        : typeof result?.error === "string"
          ? result.error
          : typeof result?.message === "string"
            ? result.message
            : typeof result?.errors === "object" && result.errors !== null
              ? JSON.stringify(result.errors)
              : `Jupiter Studio returned HTTP ${response.status} without an error description.`;
      console.error("[jupiter-studio] create-tx rejected", { status: response.status, details: details.slice(0, 1000) });
      return NextResponse.json({ error: "Jupiter Studio could not build a launch transaction.", details: details.slice(0, 1000) }, { status: 502 });
    }
    if (typeof result?.transaction !== "string" || typeof result?.mint !== "string" || typeof result?.imagePresignedUrl !== "string" || typeof result?.metadataPresignedUrl !== "string" || typeof result?.imageUrl !== "string") return NextResponse.json({ error: "Jupiter Studio returned an incomplete launch response." }, { status: 502 });
    return NextResponse.json({ ...result, listingId, tokenSymbol, feeSelection, description: listing.description });
  } catch { return NextResponse.json({ error: "Could not reach Jupiter Studio." }, { status: 502 }); }
}
