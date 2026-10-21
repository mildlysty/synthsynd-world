import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getAuthenticatedSupabase } from "../../../_lib/auth";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Sign in to attach a token to your listing." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
  const listingId = typeof body.listingId === "string" ? body.listingId : "";
  const mint = typeof body.mint === "string" ? body.mint : "";
  const configKey = typeof body.configKey === "string" ? body.configKey : "";
  const creatorWallet = typeof body.creatorWallet === "string" ? body.creatorWallet : "";
  const tokenSymbol = typeof body.tokenSymbol === "string" ? body.tokenSymbol.trim().toUpperCase() : "";
  const feeSelection = body.feeSelection === "frenzy" ? "frenzy" : body.feeSelection === "market" ? "market" : "";
  const vaultMode = body.vaultMode === true;
  if (!/^[0-9a-f-]{36}$/i.test(listingId) || !feeSelection || !/^[A-Z0-9]{2,10}$/.test(tokenSymbol)) return NextResponse.json({ error: "Listing or token details are invalid." }, { status: 400 });
  try { new PublicKey(mint); if (configKey) new PublicKey(configKey); new PublicKey(creatorWallet); } catch { return NextResponse.json({ error: "Mint, launch config key, or creator wallet is invalid." }, { status: 400 }); }
  const { data, error } = await auth.supabase.from("agents").update({ token_address: mint, token_symbol: tokenSymbol, launch_config_key: configKey || null, token_creator_wallet: creatorWallet, fee_selection: feeSelection, vault_mode: vaultMode })
    .eq("id", listingId).eq("owner_id", auth.user.id).is("token_address", null).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not attach the token. Confirm the listing columns and permissions are migrated." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Listing not found, not owned by this account, or already tokenized." }, { status: 409 });
  return NextResponse.json({ success: true, mint, configKey: configKey || null });
}
