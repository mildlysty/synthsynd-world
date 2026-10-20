import { NextResponse } from "next/server";
import { getAuthenticatedSupabase, stripeRequest } from "../../_lib/auth";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Sign in to set up seller payouts." }, { status: 401 });
  let country = "";
  try { country = String((await request.json()).country || "").toUpperCase(); } catch { /* empty body */ }
  if (!/^[A-Z]{2}$/.test(country)) return NextResponse.json({ error: "Enter a valid two-letter country code." }, { status: 400 });

  try {
    let { data: seller } = await auth.supabase.from("marketplace_seller_accounts")
      .select("stripe_account_id,country").eq("owner_id", auth.user.id).maybeSingle();
    if (seller && seller.country !== country) return NextResponse.json({ error: "Country cannot be changed after seller onboarding starts." }, { status: 409 });
    if (!seller) {
      const accountParams = new URLSearchParams({ type: "express", country, email: auth.user.email || "", "capabilities[card_payments][requested]": "true", "capabilities[transfers][requested]": "true", "metadata[synthsynd_user_id]": auth.user.id });
      const stripeAccount = await stripeRequest("accounts", accountParams);
      const { data, error } = await auth.supabase.from("marketplace_seller_accounts").insert({ owner_id: auth.user.id, stripe_account_id: stripeAccount.id, country, charges_enabled: Boolean(stripeAccount.charges_enabled), details_submitted: Boolean(stripeAccount.details_submitted) }).select("stripe_account_id,country").single();
      if (error) return NextResponse.json({ error: "Could not save the payout account. Retry or contact support." }, { status: 500 });
      seller = data;
    }
    const origin = new URL(request.url).origin;
    const linkParams = new URLSearchParams({ account: seller.stripe_account_id, refresh_url: `${origin}/payouts?refresh=1`, return_url: `${origin}/payouts?connected=1`, type: "account_onboarding" });
    const link = await stripeRequest("account_links", linkParams);
    return NextResponse.json({ url: link.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start seller onboarding." }, { status: 502 });
  }
}
