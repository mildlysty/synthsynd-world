import { NextResponse } from "next/server";
import { getAuthenticatedSupabase, stripeRequest } from "../../_lib/auth";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Sign in to add credits." }, { status: 401 });
  let amount = 0;
  try { amount = Number((await request.json()).amount); } catch { /* validated below */ }
  if (!Number.isFinite(amount) || amount < 5 || amount > 500 || Math.round(amount * 100) !== amount * 100) return NextResponse.json({ error: "Choose a top-up between $5 and $500, in whole cents." }, { status: 400 });
  const origin = new URL(request.url).origin;
  const params = new URLSearchParams({
    mode: "payment", "line_items[0][quantity]": "1", "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(Math.round(amount * 100)),
    "line_items[0][price_data][product_data][name]": `${amount.toFixed(2)} Synthsynd API credits`,
    "metadata[purpose]": "credit_topup", "metadata[owner_id]": auth.user.id,
    success_url: `${origin}/credits?checkout=success`, cancel_url: `${origin}/credits?checkout=cancelled`,
  });
  if (auth.user.email) params.set("customer_email", auth.user.email);
  try {
    const session = await stripeRequest("checkout/sessions", params);
    return typeof session.url === "string" ? NextResponse.json({ url: session.url }) : NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start credit checkout." }, { status: 502 }); }
}
