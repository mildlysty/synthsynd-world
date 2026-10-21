import { NextResponse } from "next/server";
import { requireMarketplaceAdmin } from "../../_lib/admin";

export async function POST(request: Request) {
  const access = await requireMarketplaceAdmin(request);
  if ("response" in access) return access.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send valid JSON." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const prizePool = Number(body.prize_pool_usd);
  const startsAt = typeof body.starts_at === "string" ? new Date(body.starts_at) : null;
  const endsAt = typeof body.ends_at === "string" ? new Date(body.ends_at) : null;

  if (title.length < 3 || title.length > 120) {
    return NextResponse.json({ error: "Title must be between 3 and 120 characters." }, { status: 400 });
  }
  if (description.length > 2000) {
    return NextResponse.json({ error: "Description must be 2,000 characters or fewer." }, { status: 400 });
  }
  if (!Number.isFinite(prizePool) || prizePool < 0 || prizePool > 9999999999.99) {
    return NextResponse.json({ error: "Prize pool must be a valid non-negative USD amount." }, { status: 400 });
  }
  if (!startsAt || !endsAt || !Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) {
    return NextResponse.json({ error: "Choose valid dates, with the end after the start." }, { status: 400 });
  }

  const slugBase = title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "competition";
  const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
  const { data, error } = await access.admin
    .from("marketplace_competitions")
    .insert({
      slug,
      title,
      description,
      prize_pool_usd: prizePool,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "upcoming",
      ranking_metric: "volume",
    })
    .select("id,slug,title,description,prize_pool_usd,starts_at,ends_at,status,ranking_metric,winner_display_name,winner_prize_usd")
    .single();

  if (error) {
    console.error("[admin-competitions] Create competition failed", { actorId: access.actorId, code: error.code, message: error.message });
    return NextResponse.json({ error: "Could not create the competition. Check the database migration and try again." }, { status: 500 });
  }
  return NextResponse.json({ competition: data }, { status: 201 });
}
