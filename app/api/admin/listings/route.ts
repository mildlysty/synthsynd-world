import { NextResponse } from "next/server";
import { requireMarketplaceAdmin } from "../../_lib/admin";

const statuses = new Set(["pending", "published", "rejected", "suspended"]);

export async function GET(request: Request) {
  const auth = await requireMarketplaceAdmin(request);
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "pending";
  const page = Math.max(1, Math.floor(Number(url.searchParams.get("page")) || 1));
  const limit = Math.min(50, Math.max(1, Math.floor(Number(url.searchParams.get("limit")) || 20)));
  if (status !== "all" && !statuses.has(status)) return NextResponse.json({ error: "Invalid moderation status." }, { status: 400 });

  let query = auth.admin.from("agents")
    .select("id,name,description,image_url,user_id,owner_id,statusType,created_at,publication_status,token_address,x402_url,mcp_server_url", { count: "exact" })
    .order("created_at", { ascending: false });
  if (status !== "all") query = query.eq("publication_status", status);
  const { data, error, count } = await query.range((page - 1) * limit, page * limit - 1);
  if (error) return NextResponse.json({ error: "Could not load moderation queue. Apply the moderation migration first." }, { status: 500 });
  const rows = data ?? [];
  const ids = rows.map((listing) => listing.id);
  const { data: events } = ids.length ? await auth.admin.from("marketplace_moderation_events")
    .select("id,listing_id,moderator_id,previous_status,new_status,reason,created_at")
    .in("listing_id", ids).order("created_at", { ascending: false }).limit(Math.min(200, ids.length * 5)) : { data: [] };
  const eventsByListing = new Map<string, typeof events>();
  for (const event of events ?? []) {
    const current = eventsByListing.get(event.listing_id) ?? [];
    current.push(event);
    eventsByListing.set(event.listing_id, current);
  }
  return NextResponse.json({
    listings: rows.map((listing) => ({ ...listing, moderation_events: eventsByListing.get(listing.id) ?? [] })),
    total: count ?? 0, page, limit, has_more: (count ?? 0) > page * limit,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireMarketplaceAdmin(request);
  if ("response" in auth) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
  const listingId = typeof body.listingId === "string" ? body.listingId : "";
  const status = typeof body.status === "string" ? body.status : "";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
  if (!/^[0-9a-f-]{36}$/i.test(listingId) || !statuses.has(status)) {
    return NextResponse.json({ error: "A valid listingId and moderation status are required." }, { status: 400 });
  }
  const { data, error } = await auth.admin.rpc("moderate_marketplace_listing", {
    p_listing_id: listingId, p_moderator_id: auth.actorId, p_new_status: status, p_reason: reason,
  });
  if (error) return NextResponse.json({ error: "Could not save moderation decision. Apply the moderation migration first." }, { status: 500 });
  if (!data?.success) return NextResponse.json({ error: data?.error === "not_found" ? "Listing not found." : "Moderation request was rejected." }, { status: data?.error === "not_found" ? 404 : 400 });
  return NextResponse.json({ success: true, listingId, status, previousStatus: data.previous_status });
}
