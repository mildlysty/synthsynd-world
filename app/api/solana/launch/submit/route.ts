import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getAuthenticatedSupabase } from "../../../_lib/auth";

const imageTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Sign in before submitting a token launch." }, { status: 401 });
  const apiKey = process.env.JUPITER_API_KEY || process.env.JUPITER_STUDIO_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Jupiter Studio is not configured." }, { status: 503 });

  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 }); }
  const listingId = String(form.get("listingId") || "");
  const ownerWallet = String(form.get("ownerWallet") || "");
  const signedTransaction = String(form.get("signedTransaction") || "");
  const tokenSymbol = String(form.get("tokenSymbol") || "").trim().toUpperCase();
  const feeSelection = String(form.get("feeSelection") || "");
  const vaultMode = String(form.get("vaultMode") || "false") === "true";
  const image = form.get("headerImage");
  if (!/^[0-9a-f-]{36}$/i.test(listingId) || !/^[A-Z0-9]{2,10}$/.test(tokenSymbol) || !["market", "frenzy"].includes(feeSelection) || !signedTransaction || signedTransaction.length > 2_000_000) {
    return NextResponse.json({ error: "Launch details are missing or invalid." }, { status: 400 });
  }
  try { new PublicKey(ownerWallet); } catch { return NextResponse.json({ error: "The wallet address is invalid." }, { status: 400 }); }
  if (image instanceof File && (image.size > 5_000_000 || !imageTypes.has(image.type))) {
    return NextResponse.json({ error: "Header image must be JPEG, PNG, GIF, or WebP and no larger than 5 MB." }, { status: 400 });
  }

  const { data: listing, error: listingError } = await auth.supabase.from("agents")
    .select("id,name,description,owner_id,token_address")
    .eq("id", listingId).eq("owner_id", auth.user.id).maybeSingle();
  if (listingError) return NextResponse.json({ error: "Could not verify listing ownership." }, { status: 500 });
  if (!listing) return NextResponse.json({ error: "Listing not found or not owned by this account." }, { status: 404 });
  if (listing.token_address) return NextResponse.json({ error: "This listing already has a token." }, { status: 409 });

  const jupiterForm = new FormData();
  jupiterForm.set("transaction", signedTransaction);
  jupiterForm.set("owner", ownerWallet);
  jupiterForm.set("content", JSON.stringify({ name: String(listing.name).slice(0, 32), symbol: tokenSymbol, description: vaultMode ? "Token holder access is enabled. Visit Synthsynd World to verify access." : listing.description || "" }));
  if (image instanceof File) jupiterForm.set("headerImage", image, image.name);

  let result: any;
  try {
    const response = await fetch("https://api.jup.ag/studio/v1/dbc-pool/submit", {
      method: "POST", headers: { "x-api-key": apiKey }, body: jupiterForm,
      signal: AbortSignal.timeout(60_000),
    });
    result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true || typeof result?.data?.mint !== "string") {
      return NextResponse.json({ error: "Jupiter Studio did not confirm the token launch.", details: typeof result?.error === "string" ? result.error : undefined }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "Could not reach Jupiter Studio to submit the signed transaction." }, { status: 502 });
  }

  const mint = String(result.data.mint);
  const configKey = typeof result.data.configKey === "string" ? result.data.configKey : null;
  const { error: updateError } = await auth.supabase.from("agents").update({
    token_address: mint, token_symbol: tokenSymbol, launch_config_key: configKey,
    token_creator_wallet: ownerWallet, fee_selection: feeSelection,
    vault_mode: vaultMode,
  }).eq("id", listingId).eq("owner_id", auth.user.id);
  if (updateError) {
    return NextResponse.json({ error: "The token was launched, but the listing could not be updated. Use the authenticated recovery endpoint with this mint and config key.", mint, configKey }, { status: 500 });
  }
  return NextResponse.json({ success: true, mint, configKey, listingId });
}
