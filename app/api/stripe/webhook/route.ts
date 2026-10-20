import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function validStripeSignature(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const values = Object.fromEntries(header.split(",").map((part) => part.split("=", 2)));
  const timestamp = Number(values.t);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300 || !values.v1) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(values.v1, "hex");
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!webhookSecret || !supabaseUrl || !serviceKey) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const raw = await request.text();
  if (!validStripeSignature(raw, request.headers.get("stripe-signature"), webhookSecret)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });

  let event: { id?: string; type?: string; data?: { object?: Record<string, unknown> } };
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid event body." }, { status: 400 }); }
  if (!event.id || !event.type) return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: seen } = await admin.from("marketplace_stripe_events").select("event_id").eq("event_id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  const object = event.data?.object ?? {};
  if (event.type === "checkout.session.completed" && object.mode === "payment" && object.payment_status === "paid" && (object.metadata as Record<string, unknown> | undefined)?.purpose === "credit_topup") {
    const metadata = object.metadata as Record<string, unknown>;
    const ownerId = typeof metadata.owner_id === "string" ? metadata.owner_id : "";
    const amount = typeof object.amount_total === "number" ? object.amount_total / 100 : 0;
    if (!ownerId || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Invalid credit top-up metadata." }, { status: 400 });
    const { data: credited, error } = await admin.rpc("apply_marketplace_credit_topup", { p_owner_id: ownerId, p_amount: amount, p_reference: String(object.id) });
    if (error || !credited) return NextResponse.json({ error: "Could not apply credit top-up." }, { status: 500 });
  } else if (event.type === "checkout.session.completed" && object.mode === "payment" && object.payment_status === "paid" && typeof object.id === "string") {
    const { error } = await admin.from("marketplace_purchases").update({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent_id: typeof object.payment_intent === "string" ? object.payment_intent : null, amount_total: typeof object.amount_total === "number" ? object.amount_total : 0, currency: typeof object.currency === "string" ? object.currency : "usd" }).eq("stripe_session_id", object.id);
    if (error) return NextResponse.json({ error: "Could not update purchase." }, { status: 500 });
  } else if (event.type === "checkout.session.completed" && object.mode === "subscription" && ["paid", "no_payment_required"].includes(String(object.payment_status)) && typeof object.id === "string") {
    const ownerId = typeof (object.metadata as Record<string, unknown> | undefined)?.owner_id === "string" ? String((object.metadata as Record<string, unknown>).owner_id) : "";
    const planCode = typeof (object.metadata as Record<string, unknown> | undefined)?.plan_code === "string" ? String((object.metadata as Record<string, unknown>).plan_code) : "free";
    if (ownerId && ["pro", "premium", "enterprise"].includes(planCode)) {
      const { error } = await admin.from("marketplace_subscriptions").upsert({ owner_id: ownerId, stripe_customer_id: typeof object.customer === "string" ? object.customer : null, stripe_subscription_id: typeof object.subscription === "string" ? object.subscription : null, plan_code: planCode, status: "active", updated_at: new Date().toISOString() }, { onConflict: "owner_id" });
      if (error) return NextResponse.json({ error: "Could not activate subscription." }, { status: 500 });
    }
  } else if ((event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") && typeof object.id === "string") {
    const metadata = object.metadata as Record<string, unknown> | undefined;
    const ownerId = typeof metadata?.owner_id === "string" ? metadata.owner_id : "";
    const planCode = typeof metadata?.plan_code === "string" ? metadata.plan_code : "free";
    if (ownerId) {
      const periodEnd = typeof object.current_period_end === "number" ? new Date(object.current_period_end * 1000).toISOString() : null;
      const status = event.type === "customer.subscription.deleted" ? "canceled" : String(object.status || "inactive");
      const { error } = await admin.from("marketplace_subscriptions").upsert({ owner_id: ownerId, stripe_customer_id: typeof object.customer === "string" ? object.customer : null, stripe_subscription_id: object.id, plan_code: status === "active" || status === "trialing" ? planCode : "free", status, current_period_end: periodEnd, cancel_at_period_end: Boolean(object.cancel_at_period_end), updated_at: new Date().toISOString() }, { onConflict: "owner_id" });
      if (error) return NextResponse.json({ error: "Could not synchronize subscription." }, { status: 500 });
    }
  } else if (event.type === "checkout.session.expired" && typeof object.id === "string") {
    const { error } = await admin.from("marketplace_purchases").update({ status: "expired" }).eq("stripe_session_id", object.id).eq("status", "pending");
    if (error) return NextResponse.json({ error: "Could not update purchase." }, { status: 500 });
  } else if (event.type === "account.updated" && typeof object.id === "string") {
    const { error } = await admin.from("marketplace_seller_accounts").update({
      details_submitted: Boolean(object.details_submitted),
      charges_enabled: Boolean(object.charges_enabled),
      updated_at: new Date().toISOString(),
    }).eq("stripe_account_id", object.id);
    if (error) return NextResponse.json({ error: "Could not update seller account." }, { status: 500 });
  }
  const { error: seenError } = await admin.from("marketplace_stripe_events").insert({ event_id: event.id });
  if (seenError && seenError.code !== "23505") return NextResponse.json({ error: "Could not record event." }, { status: 500 });
  return NextResponse.json({ received: true });
}
