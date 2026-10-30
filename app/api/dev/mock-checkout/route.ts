import { NextResponse } from "next/server";
import { getAdminSupabase, getAuthenticatedSupabase } from "../../_lib/auth";
import { createLocalMockGrantCookie, localMockCheckoutEnabled } from "../../_lib/local-mock-checkout";

export async function POST(request: Request) {
  if (!localMockCheckoutEnabled()) return NextResponse.json({ error: "Local test checkout is disabled." }, { status: 404 });
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Sign in first to test listing access." }, { status: 401 });
  const body = await request.json().catch(() => null) as { listingId?: unknown } | null;
  const listingId = typeof body?.listingId === "string" ? body.listingId.trim() : "";
  if (!listingId || listingId.length > 100) return NextResponse.json({ error: "A valid listing ID is required." }, { status: 400 });
  const admin = getAdminSupabase();
  if (!admin) return NextResponse.json({ error: "Marketplace server configuration is incomplete." }, { status: 503 });

  const { data: listing, error } = await admin.from("agents")
    .select("id,owner_id,is_free,price_inr,vault_mode,agent_code,prompt_body,tool_code,skill_content")
    .eq("id", listingId).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not verify this listing." }, { status: 500 });
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (listing.owner_id === auth.user.id) return NextResponse.json({ error: "Creators already have access to their own listing." }, { status: 400 });
  if (listing.is_free || listing.price_inr == null || Number(listing.price_inr) <= 0) {
    return NextResponse.json({ error: "Only paid listings with an INR price can use the local checkout demo." }, { status: 400 });
  }
  if (listing.vault_mode) return NextResponse.json({ error: "This listing uses token-holder access, which the mock checkout will not bypass." }, { status: 403 });
  const hasContent = [listing.agent_code, listing.prompt_body, listing.tool_code, listing.skill_content].some((value) => typeof value === "string" && value.trim().length > 0);
  if (!hasContent) return NextResponse.json({ error: "This paid listing has no source or prompt content attached yet." }, { status: 409 });

  const response = NextResponse.json({ ok: true, testOnly: true, expiresInSeconds: 1800 });
  response.headers.append("Set-Cookie", createLocalMockGrantCookie(auth.user.id, listingId));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
