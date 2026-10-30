import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminSupabase, getAuthenticatedSupabase } from "../../_lib/auth";

export const runtime = "nodejs";

type Body = { listingId?: unknown; bundleId?: unknown };
type PaymentResponse = {
  paymentId?: unknown;
  orderId?: unknown;
  amount?: unknown;
  status?: unknown;
  checkoutUrl?: unknown;
};

function parseHttpUrl(value: string | undefined, label: string, allowLocalHttp: boolean) {
  if (!value) throw new Error(`${label} is not configured.`);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }

  const localHttp =
    allowLocalHttp &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(url.hostname);

  if (url.protocol !== "https:" && !localHttp) {
    throw new Error(`${label} must use HTTPS.`);
  }

  return url;
}

function formatRupees(paise: number) {
  return (paise / 100).toFixed(2);
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Sign in before purchasing." },
      { status: 401 },
    );
  }

  // YouPI describes itself as experimental and not production-ready.
  // Keep real customer checkout off the live site.
  if (
    process.env.NODE_ENV === "production" ||
    process.env.YOUPI_CHECKOUT_ENABLED !== "true"
  ) {
    return NextResponse.json(
      {
        error:
          "YouPI checkout is disabled on the live site. Use a local development setup for controlled testing.",
      },
      { status: 503 },
    );
  }

  const merchantId = process.env.YOUPI_MERCHANT_ID;
  const merchantKey = process.env.YOUPI_MERCHANT_KEY;

  if (!merchantId || !merchantKey) {
    return NextResponse.json(
      { error: "YouPI merchant credentials are not configured on this server." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const listingId =
    typeof body?.listingId === "string" ? body.listingId.trim() : "";
  const bundleId =
    typeof body?.bundleId === "string" ? body.bundleId.trim() : "";

  if (
    Boolean(listingId) === Boolean(bundleId) ||
    (listingId || bundleId).length > 100
  ) {
    return NextResponse.json(
      { error: "Choose exactly one valid listing or bundle." },
      { status: 400 },
    );
  }

  let apiUrl: URL;
  let returnUrl: URL;
  let checkoutOrigin: URL;

  try {
    apiUrl = parseHttpUrl(process.env.YOUPI_API_URL, "YOUPI_API_URL", true);

    const returnValue =
      process.env.YOUPI_RETURN_URL ||
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/checkout/success`;

    returnUrl = parseHttpUrl(returnValue, "YOUPI_RETURN_URL", true);

    checkoutOrigin = parseHttpUrl(
      process.env.YOUPI_CHECKOUT_ORIGIN || apiUrl.origin,
      "YOUPI_CHECKOUT_ORIGIN",
      true,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "YouPI URL configuration is invalid.",
      },
      { status: 503 },
    );
  }

  const admin = getAdminSupabase();
  if (!admin) {
    return NextResponse.json(
      { error: "Marketplace payment database configuration is incomplete." },
      { status: 503 },
    );
  }

  let amountRupees: number;
  let title: string;

  if (listingId) {
    const { data, error } = await admin
      .from("agents")
      .select(
        "id,name,owner_id,user_id,is_free,price_inr,vault_mode,agent_code,prompt_body,tool_code,skill_content,publication_status",
      )
      .eq("id", listingId)
      .eq("publication_status", "published")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Could not verify this listing." },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 },
      );
    }

    if ((data.owner_id || data.user_id) === auth.user.id) {
      return NextResponse.json(
        { error: "You already have access to your own listing." },
        { status: 400 },
      );
    }

    if (data.is_free || data.price_inr == null || Number(data.price_inr) <= 0) {
      return NextResponse.json(
        { error: "This listing has no paid INR price." },
        { status: 400 },
      );
    }

    if (data.vault_mode) {
      return NextResponse.json(
        { error: "Token-holder gated listings cannot use this checkout." },
        { status: 403 },
      );
    }

    if (
      ![
        data.agent_code,
        data.prompt_body,
        data.tool_code,
        data.skill_content,
      ].some((value) => typeof value === "string" && value.trim())
    ) {
      return NextResponse.json(
        { error: "This listing has no usable content attached yet." },
        { status: 409 },
      );
    }

    amountRupees = Number(data.price_inr);
    title = data.name;
  } else {
    const { data, error } = await admin
      .from("marketplace_bundles")
      .select("id,name,owner_id,is_free,price_inr")
      .eq("id", bundleId)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Could not verify this bundle." },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Bundle not found." },
        { status: 404 },
      );
    }

    if (data.owner_id === auth.user.id) {
      return NextResponse.json(
        { error: "You already have access to your own bundle." },
        { status: 400 },
      );
    }

    if (data.is_free || data.price_inr == null || Number(data.price_inr) <= 0) {
      return NextResponse.json(
        { error: "This bundle has no paid INR price." },
        { status: 400 },
      );
    }

    amountRupees = Number(data.price_inr);
    title = data.name;
  }

  const amountPaise = Math.round(amountRupees * 100);

  if (
    !Number.isSafeInteger(amountPaise) ||
    amountPaise < 100 ||
    amountPaise > 5_000_000_000
  ) {
    return NextResponse.json(
      { error: "The INR price must be between ₹1 and ₹5 crore." },
      { status: 400 },
    );
  }

  let pendingQuery = admin
    .from("marketplace_purchases")
    .select("youpi_order_id,youpi_checkout_url")
    .eq("buyer_id", auth.user.id)
    .eq("payment_gateway", "youpi")
    .eq("status", "pending")
    .eq("amount_total", amountPaise)
    .eq("currency", "inr")
    .gt("created_at", new Date(Date.now() - 10 * 60_000).toISOString());

  pendingQuery = listingId
    ? pendingQuery.eq("listing_id", listingId)
    : pendingQuery.eq("bundle_id", bundleId);

  const { data: pending } = await pendingQuery
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pending?.youpi_order_id && pending.youpi_checkout_url) {
    return NextResponse.json({
      orderId: pending.youpi_order_id,
      checkoutUrl: pending.youpi_checkout_url,
    });
  }

  const orderId = `sw_${randomUUID().replaceAll("-", "")}`;

  const { error: insertError } = await admin
    .from("marketplace_purchases")
    .insert({
      buyer_id: auth.user.id,
      listing_id: listingId || null,
      bundle_id: bundleId || null,
      stripe_session_id: null,
      youpi_order_id: orderId,
      amount_total: amountPaise,
      currency: "inr",
      payment_gateway: "youpi",
      status: "pending",
    });

  if (insertError) {
    console.error("[youpi] Could not save pending purchase", {
      code: insertError.code,
    });

    return NextResponse.json(
      { error: "Could not create the pending purchase record." },
      { status: 500 },
    );
  }

  const finalReturnUrl = new URL(returnUrl);
  finalReturnUrl.searchParams.set("youpi_order_id", orderId);

  let providerResponse: Response;

  try {
    providerResponse = await fetch(new URL("/api/v1/payments", apiUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Merchant-Id": merchantId,
        "X-Merchant-Key": merchantKey,
      },
      body: JSON.stringify({
        orderId,
        amount: formatRupees(amountPaise),
        currency: "INR",
        returnUrl: finalReturnUrl.toString(),
        metadata: {
          product: "synthsynd-world",
          listingId: listingId || undefined,
          bundleId: bundleId || undefined,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    await admin
      .from("marketplace_purchases")
      .update({ status: "failed" })
      .eq("youpi_order_id", orderId)
      .eq("status", "pending");

    return NextResponse.json(
      {
        error:
          "Could not reach the YouPI payment API. No checkout link was issued.",
      },
      { status: 502 },
    );
  }

  const payment = (await providerResponse.json().catch(() => null)) as
    | PaymentResponse
    | null;

  let checkoutUrl: URL | null = null;

  try {
    if (typeof payment?.checkoutUrl === "string") {
      checkoutUrl = new URL(payment.checkoutUrl);
    }
  } catch {
    checkoutUrl = null;
  }

  const allowedCheckoutOrigin = checkoutOrigin.origin;
  const secureCheckout =
    checkoutUrl &&
    checkoutUrl.origin === allowedCheckoutOrigin &&
    (checkoutUrl.protocol === "https:" ||
      (checkoutUrl.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(checkoutUrl.hostname)));

  const responseAmount =
    typeof payment?.amount === "number"
      ? payment.amount.toFixed(2)
      : String(payment?.amount ?? "");

  if (
    !providerResponse.ok ||
    !payment ||
    payment.status !== "ACTIVE" ||
    payment.orderId !== orderId ||
    responseAmount !== formatRupees(amountPaise) ||
    !payment.paymentId ||
    !secureCheckout
  ) {
    console.error("[youpi] Payment creation was rejected", {
      status: providerResponse.status,
    });

    await admin
      .from("marketplace_purchases")
      .update({ status: "failed" })
      .eq("youpi_order_id", orderId)
      .eq("status", "pending");

    return NextResponse.json(
      {
        error:
          "YouPI did not return a valid checkout session. No payment link was issued.",
      },
      { status: 502 },
    );
  }

  const { error: updateError } = await admin
    .from("marketplace_purchases")
    .update({
      youpi_payment_id: String(payment.paymentId),
      youpi_checkout_url: checkoutUrl.toString(),
    })
    .eq("youpi_order_id", orderId)
    .eq("status", "pending");

  if (updateError) {
    console.error("[youpi] Could not persist checkout session", {
      orderId,
      code: updateError.code,
    });

    return NextResponse.json(
      {
        error:
          "The payment session was created but could not be safely saved. Contact support before retrying.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { orderId, checkoutUrl: checkoutUrl.toString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}