import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminSupabase } from "../../_lib/auth";

export const runtime = "nodejs";

type YoupiEvent = {
  event?: unknown;
  method?: unknown;
  settlementState?: unknown;
  orderId?: unknown;
  amountPaise?: unknown;
  currency?: unknown;
  utr?: unknown;
  paymentId?: unknown;
  deliveryId?: unknown;
};

function signatureMatches(rawBody: Buffer, signatureHeader: string | null, timestamp: string | null, secret: string) {
  if (!signatureHeader) return false;
  const v2Header = signatureHeader;
  const expectedV2 = timestamp
    ? `sha256=${createHmac("sha256", secret).update(Buffer.concat([Buffer.from(`${timestamp}.`), rawBody])).digest("hex")}`
    : "";
  if (expectedV2 && equalText(v2Header, expectedV2)) return true;

  const supplied = v2Header.startsWith("sha256=") ? v2Header.slice(7) : v2Header;
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(supplied, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function equalText(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.YOUPI_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "YouPI webhook is not configured." }, { status: 503 });

  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get("x-gateway-signature-v2") || request.headers.get("x-gateway-signature");
  const timestamp = request.headers.get("x-gateway-timestamp");
  if (!signatureMatches(rawBody, signature, timestamp, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event: YoupiEvent;
  try { event = JSON.parse(rawBody.toString("utf8")) as YoupiEvent; } catch { return NextResponse.json({ error: "Invalid event body." }, { status: 400 }); }
  const eventName = typeof event.event === "string" ? event.event : "";
  const orderId = typeof event.orderId === "string" ? event.orderId : "";
  const deliveryIdHeader = request.headers.get("x-gateway-delivery-id");
  const deliveryId = typeof event.deliveryId === "string" ? event.deliveryId : "";
  if (!eventName || !orderId || !deliveryId || !deliveryIdHeader || deliveryId !== deliveryIdHeader || request.headers.get("x-gateway-event") !== eventName) {
    return NextResponse.json({ error: "Webhook event identifiers do not match." }, { status: 400 });
  }

  const admin = getAdminSupabase();
  if (!admin) return NextResponse.json({ error: "Marketplace payment database configuration is incomplete." }, { status: 503 });

  const { data: seen, error: seenError } = await admin.from("marketplace_youpi_events").select("event_id").eq("event_id", deliveryId).maybeSingle();
  if (seen) return NextResponse.json({ received: true, duplicate: true });
  if (seenError) return NextResponse.json({ error: "Could not check webhook delivery status." }, { status: 500 });

  const allowedEvents = new Set(["OBSERVED_SUCCESS", "RECONCILED", "MANUAL_REVIEW", "SUCCESS", "FAILED", "EXPIRED", "CANCELLED"]);
  if (!allowedEvents.has(eventName)) return NextResponse.json({ received: true, ignored: true });

  if (eventName === "RECONCILED") {
    if (event.method !== "UPI" || event.settlementState !== "RECONCILED" ||
        !Number.isSafeInteger(event.amountPaise) || typeof event.amountPaise !== "number" ||
        (event.currency !== undefined && event.currency !== "INR") ||
        typeof event.paymentId !== "string" || !event.paymentId ||
        typeof event.utr !== "string" || !/^\d{12}$/.test(event.utr)) {
      return NextResponse.json({ error: "The reconciled UPI event is missing required verification fields." }, { status: 400 });
    }

    const { data: purchase, error } = await admin.from("marketplace_purchases")
      .select("id,amount_total,currency,status,youpi_payment_id")
      .eq("youpi_order_id", orderId).eq("payment_gateway", "youpi").maybeSingle();
    if (error) return NextResponse.json({ error: "Could not load the pending purchase." }, { status: 500 });
    if (!purchase) return NextResponse.json({ error: "No marketplace purchase matches this order." }, { status: 404 });
    if (purchase.currency !== "inr" || purchase.amount_total !== event.amountPaise) {
      console.error("[youpi] Reconciled payment mismatch", { orderId });
      return NextResponse.json({ error: "Reconciled payment amount does not match the marketplace order." }, { status: 409 });
    }
    if (purchase.status === "paid" && purchase.youpi_payment_id !== event.paymentId) {
      return NextResponse.json({ error: "This order was already paid using a different payment reference." }, { status: 409 });
    }
    if (purchase.status === "pending") {
      const { data: updated, error: updateError } = await admin.from("marketplace_purchases").update({
        status: "paid",
        paid_at: new Date().toISOString(),
        youpi_payment_id: event.paymentId,
        payment_gateway: "youpi",
      }).eq("id", purchase.id).eq("status", "pending").select("id").maybeSingle();
      if (updateError) return NextResponse.json({ error: "Could not record the reconciled payment." }, { status: 500 });
      if (!updated) {
        const { data: latest, error: latestError } = await admin.from("marketplace_purchases").select("status,youpi_payment_id").eq("id", purchase.id).maybeSingle();
        if (latestError || latest?.status !== "paid" || latest.youpi_payment_id !== event.paymentId) {
          return NextResponse.json({ error: "Purchase status changed while recording the payment." }, { status: 409 });
        }
      }
    } else if (purchase.status !== "paid") {
      return NextResponse.json({ error: "This marketplace order is no longer payable." }, { status: 409 });
    }
  } else if (["FAILED", "EXPIRED", "CANCELLED"].includes(eventName)) {
    const { error } = await admin.from("marketplace_purchases").update({ status: eventName === "EXPIRED" ? "expired" : "failed" })
      .eq("youpi_order_id", orderId).eq("payment_gateway", "youpi").eq("status", "pending");
    if (error) return NextResponse.json({ error: "Could not record the checkout outcome." }, { status: 500 });
  }
  // OBSERVED_SUCCESS and MANUAL_REVIEW are recorded for idempotency, but never grant access.

  const { error: recordError } = await admin.from("marketplace_youpi_events").insert({ event_id: deliveryId });
  if (recordError && recordError.code !== "23505") return NextResponse.json({ error: "Could not record webhook delivery status." }, { status: 500 });
  return NextResponse.json({ received: true });
}
