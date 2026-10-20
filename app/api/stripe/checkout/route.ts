import { NextResponse } from "next/server";
import { getAdminSupabase, getAuthenticatedSupabase, stripeRequest } from "../../_lib/auth";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Sign in before purchasing." }, { status: 401 });
  const admin = getAdminSupabase();
  if (!admin) return NextResponse.json({ error: "Marketplace checkout is not configured. Set the server-only Supabase service role key." }, { status: 503 });
  let body: { listingId?: unknown; bundleId?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
  const listingId = typeof body.listingId === "string" ? body.listingId : "";
  const bundleId = typeof body.bundleId === "string" ? body.bundleId : "";
  if ((Boolean(listingId) === Boolean(bundleId)) || !/^[0-9a-f-]{36}$/i.test(listingId || bundleId)) {
    return NextResponse.json({ error: "Provide exactly one valid listingId or bundleId." }, { status: 400 });
  }

  const isBundle = Boolean(bundleId);
  let product: { id: string; name: string; description: string; price_usd: number; is_free: boolean; owner_id: string | null } | null = null;
  if (isBundle) {
    const { data, error } = await auth.supabase.from("marketplace_bundles")
      .select("id,name,description,price_usd,is_free,owner_id").eq("id", bundleId).eq("status", "published").maybeSingle();
    if (error) return NextResponse.json({ error: "Could not load this bundle." }, { status: 500 });
    product = data;
  } else {
    const { data, error } = await auth.supabase.from("agents")
      .select("id,name,description,price_usd,is_free,owner_id")
      .eq("id", listingId).maybeSingle();
    if (error) return NextResponse.json({ error: "Could not load this listing." }, { status: 500 });
    product = data;
  }
  if (!product) return NextResponse.json({ error: isBundle ? "Bundle not found." : "Listing not found." }, { status: 404 });
  if (product.is_free) return NextResponse.json({ error: "This product is free." }, { status: 400 });
  if (!product.owner_id) return NextResponse.json({ error: "The creator must have an account before paid checkout can be enabled." }, { status: 409 });
  if (product.owner_id === auth.user.id) return NextResponse.json({ error: "You cannot purchase your own product." }, { status: 400 });
  const amountCents = Math.round(Number(product.price_usd) * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents < 50) return NextResponse.json({ error: "Paid products must cost at least $0.50 for card checkout." }, { status: 400 });

  const purchaseQuery = admin.from("marketplace_purchases").select("id")
    .eq("buyer_id", auth.user.id).eq("status", "paid");
  const { data: previousPurchase, error: purchaseLookupError } = await (isBundle
    ? purchaseQuery.eq("bundle_id", bundleId).maybeSingle()
    : purchaseQuery.eq("listing_id", listingId).maybeSingle());
  if (purchaseLookupError) return NextResponse.json({ error: "Could not check purchase access. Apply the bundle-purchase migration if this is a bundle." }, { status: 500 });
  if (previousPurchase) return NextResponse.json({ error: "You already own this product." }, { status: 409 });

  const { data: seller } = await auth.supabase.from("marketplace_seller_accounts")
    .select("stripe_account_id,charges_enabled").eq("owner_id", product.owner_id).maybeSingle();
  if (!seller?.stripe_account_id || !seller.charges_enabled) return NextResponse.json({ error: "The creator has not completed payout setup." }, { status: 409 });

  const feePercent = Math.min(Math.max(Number(process.env.MARKETPLACE_FEE_PERCENT || 10), 0), 30);
  const feeCents = Math.floor(amountCents * feePercent / 100);
  const origin = new URL(request.url).origin;
  const productPath = isBundle ? `/bundle/${product.id}` : `/agent/${product.id}`;
  const params = new URLSearchParams({
    mode: "payment", "line_items[0][quantity]": "1", "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(amountCents), "line_items[0][price_data][product_data][name]": product.name,
    "line_items[0][price_data][product_data][description]": String(product.description || (isBundle ? "Marketplace bundle" : "Marketplace listing")).slice(0, 500),
    "payment_intent_data[application_fee_amount]": String(feeCents),
    "payment_intent_data[transfer_data][destination]": seller.stripe_account_id,
    "metadata[buyer_id]": auth.user.id,
    "client_reference_id": `${auth.user.id}:${isBundle ? `bundle:${product.id}` : product.id}`,
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${productPath}`,
  });
  params.set(`metadata[${isBundle ? "bundle_id" : "listing_id"}]`, product.id);
  try {
    const session = await stripeRequest("checkout/sessions", params);
    if (typeof session.id !== "string" || typeof session.url !== "string") throw new Error("Stripe did not return a checkout URL.");
    const { error: saveError } = await admin.from("marketplace_purchases").insert({
      buyer_id: auth.user.id, listing_id: isBundle ? null : product.id, bundle_id: isBundle ? product.id : null,
      stripe_session_id: session.id, amount_total: amountCents, currency: "usd", status: "pending",
    });
    if (saveError) {
      try { await stripeRequest(`checkout/sessions/${encodeURIComponent(session.id)}/expire`, new URLSearchParams()); } catch { /* prevent an orphan checkout when Stripe still allows it */ }
      return NextResponse.json({ error: "Stripe created a session, but the purchase record could not be saved. The checkout was expired when possible; configure the marketplace migrations before retrying." }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (failure) {
    return NextResponse.json({ error: failure instanceof Error ? failure.message : "Could not start checkout." }, { status: 502 });
  }
}
