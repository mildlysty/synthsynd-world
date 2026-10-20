import { NextResponse } from "next/server";
import { getAuthenticatedSupabase, stripeRequest } from "../../_lib/auth";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Sign in before subscribing." }, { status: 401 });
  let plan = "";
  try { plan = String((await request.json()).plan || ""); } catch { /* validated below */ }
  if (plan !== "pro" && plan !== "premium") return NextResponse.json({ error: "Choose a supported subscription plan." }, { status: 400 });
  const priceId = plan === "pro" ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_PREMIUM_PRICE_ID;
  if (!priceId) return NextResponse.json({ error: "This subscription plan is not configured in Stripe." }, { status: 503 });
  const { data: current } = await auth.supabase.from("marketplace_subscriptions").select("status,stripe_customer_id,plan_code").eq("owner_id", auth.user.id).maybeSingle();
  if (current && ["active", "trialing"].includes(current.status) && current.plan_code !== "free") return NextResponse.json({ error: "You already have an active subscription. Manage it from Billing settings." }, { status: 409 });
  const origin = new URL(request.url).origin;
  const fields = new URLSearchParams({
    mode: "subscription", "line_items[0][price]": priceId, "line_items[0][quantity]": "1",
    "metadata[purpose]": "marketplace_subscription", "metadata[owner_id]": auth.user.id, "metadata[plan_code]": plan,
    "subscription_data[metadata][owner_id]": auth.user.id, "subscription_data[metadata][plan_code]": plan,
    success_url: `${origin}/pricing?checkout=success`, cancel_url: `${origin}/pricing?checkout=cancelled`,
  });
  if (current?.stripe_customer_id) fields.set("customer", current.stripe_customer_id);
  else if (auth.user.email) fields.set("customer_email", auth.user.email);
  try {
    const session = await stripeRequest("checkout/sessions", fields);
    return typeof session.url === "string" ? NextResponse.json({ url: session.url }) : NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start subscription checkout." }, { status: 502 }); }
}
