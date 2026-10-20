import { NextResponse } from "next/server";
import { getAuthenticatedSupabase, stripeRequest } from "../../_lib/auth";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });
  const { data } = await auth.supabase.from("marketplace_subscriptions").select("stripe_customer_id").eq("owner_id", auth.user.id).maybeSingle();
  if (!data?.stripe_customer_id) return NextResponse.json({ error: "No Stripe customer is linked to this account yet." }, { status: 404 });
  try {
    const portal = await stripeRequest("billing_portal/sessions", new URLSearchParams({ customer: data.stripe_customer_id, return_url: `${new URL(request.url).origin}/pricing` }));
    return typeof portal.url === "string" ? NextResponse.json({ url: portal.url }) : NextResponse.json({ error: "Stripe did not return a billing URL." }, { status: 502 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not open billing portal." }, { status: 502 }); }
}
