import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedSupabase } from "../_lib/auth";
import { hasHolderAccess } from "../_lib/holder-access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Sign in to run this prompt." }, { status: 401 });
  const { supabase, user } = auth;

  let body: { listingId?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const listingId = typeof body.listingId === "string" ? body.listingId : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(listingId)) return NextResponse.json({ error: "A valid prompt listing ID is required." }, { status: 400 });
  if (!message || message.length > 8000) return NextResponse.json({ error: "Enter a message of 1–8,000 characters." }, { status: 400 });

  const { data: listing, error: listingError } = await supabase.from("agents")
    .select("id,name,statusType,is_free,description,owner_id,token_address,vault_mode")
    .eq("id", listingId).maybeSingle();
  if (listingError) return NextResponse.json({ error: "Could not load this prompt." }, { status: 500 });
  if (!listing || String(listing.statusType).toLowerCase() !== "prompt") return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
  if (listing.vault_mode && listing.token_address && listing.owner_id !== user.id && !(await hasHolderAccess(request, listingId, listing.token_address))) {
    return NextResponse.json({ error: "A signed wallet holding this listing’s token is required to run this prompt." }, { status: 403 });
  }
  let entitled = Boolean(listing.is_free) || listing.owner_id === user.id;
  if (!entitled) {
    const { data: purchase } = await supabase.from("marketplace_purchases").select("id")
      .eq("buyer_id", user.id).eq("listing_id", listingId).eq("status", "paid").maybeSingle();
    entitled = Boolean(purchase);
  }
  if (!entitled) return NextResponse.json({ error: "Purchase this prompt to run it." }, { status: 403 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) return NextResponse.json({ error: "Secure prompt execution is not configured." }, { status: 503 });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: promptData, error: promptError } = await admin.from("agents").select("prompt_body").eq("id", listingId).maybeSingle();
  if (promptError) return NextResponse.json({ error: "Could not load prompt content." }, { status: 500 });
  if (!promptData?.prompt_body?.trim()) return NextResponse.json({ error: "This prompt does not have runnable prompt content." }, { status: 422 });

  const { data: quotaAllowed, error: quotaError } = await supabase.rpc("consume_marketplace_prompt_quota", { p_listing_id: listingId });
  if (quotaError) return NextResponse.json({ error: "Prompt execution is not configured. Apply the marketplace database migration first." }, { status: 503 });
  if (!quotaAllowed) return NextResponse.json({ error: "Prompt run limit reached. Try again in a minute." }, { status: 429 });

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) return NextResponse.json({ error: "Prompt execution provider is not configured." }, { status: 503 });
  const creditCost = Number(process.env.PROMPT_RUN_CREDITS || "0.1");
  if (!Number.isFinite(creditCost) || creditCost <= 0 || creditCost > 100) return NextResponse.json({ error: "Prompt run credit pricing is not configured." }, { status: 503 });
  const runReference = crypto.randomUUID();
  const { data: charged, error: chargeError } = await supabase.rpc("consume_marketplace_credits", { p_amount: creditCost, p_reference: runReference });
  if (chargeError) return NextResponse.json({ error: "Credits are unavailable. Apply the marketplace credits migration first." }, { status: 503 });
  if (!charged) return NextResponse.json({ error: `You need ${creditCost} credits to run this prompt. Add credits to your account first.`, code: "INSUFFICIENT_CREDITS", credits_required: creditCost }, { status: 402 });

  async function refund() {
    await admin.rpc("refund_marketplace_credits", { p_owner_id: user.id, p_amount: creditCost, p_reference: runReference });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: promptData.prompt_body },
          { role: "user", content: message },
        ],
        max_completion_tokens: 800,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("Prompt provider returned an error", response.status);
      await refund();
      return NextResponse.json({ error: "The model provider could not complete this run." }, { status: 502 });
    }
    const answer = result?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer) { await refund(); return NextResponse.json({ error: "The model returned an empty response." }, { status: 502 }); }
    return NextResponse.json({ answer, credits_used: creditCost });
  } catch {
    await refund();
    return NextResponse.json({ error: "The model provider could not be reached." }, { status: 502 });
  }
}
