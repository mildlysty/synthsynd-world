import { NextResponse } from "next/server";
import { getAdminSupabase } from "../../_lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Competition = { id: string; slug: string; title: string; starts_at: string; ends_at: string; prize_pool_usd: number; status: string };
type Entry = { listing_id: string; owner_id: string };
type Snapshot = { listing_id: string; sampled_at: string; volume_24h_usd: number };

function authorized(request: Request) {
  const secret = process.env.COMPETITION_CRON_SECRET || process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const admin = getAdminSupabase();
  if (!admin) return NextResponse.json({ error: "Competition scoring needs the server Supabase service role key." }, { status: 503 });
  const now = new Date();
  const { data: competitions, error: competitionsError } = await admin.from("marketplace_competitions")
    .select("id,slug,title,starts_at,ends_at,prize_pool_usd,status")
    .in("status", ["upcoming", "active"]).lte("starts_at", now.toISOString());
  if (competitionsError) return NextResponse.json({ error: "Could not load competitions. Apply the competition history migration." }, { status: 500 });

  const sampleResults: Array<{ competitionId: string; snapshots: number }> = [];
  for (const competition of (competitions ?? []) as Competition[]) {
    const started = new Date(competition.starts_at).getTime() <= now.getTime();
    const ended = new Date(competition.ends_at).getTime() <= now.getTime();
    const { data: entries, error: entriesError } = await admin.from("marketplace_competition_entries")
      .select("listing_id,owner_id").eq("competition_id", competition.id).neq("status", "disqualified");
    if (entriesError || !entries?.length) {
      if (ended) await admin.from("marketplace_competitions").update({ status: "completed" }).eq("id", competition.id);
      else if (competition.status !== "active") await admin.from("marketplace_competitions").update({ status: "active" }).eq("id", competition.id);
      continue;
    }

    if (!ended) {
      const marketResponse = await fetch(new URL("/api/solana/market-data", request.url), { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      const marketBody = await marketResponse.json().catch(() => null);
      if (!marketResponse.ok || !Array.isArray(marketBody?.items)) return NextResponse.json({ error: "Could not sample token volumes from Jupiter market data." }, { status: 502 });
      const entryIds = new Set((entries as Entry[]).map((entry) => entry.listing_id));
      const snapshots = marketBody.items.flatMap((item: { id?: unknown; volume24hUsd?: unknown }) => {
        if (typeof item.id !== "string" || !entryIds.has(item.id) || typeof item.volume24hUsd !== "number" || !Number.isFinite(item.volume24hUsd) || item.volume24hUsd < 0) return [];
        return [{ competition_id: competition.id, listing_id: item.id, sampled_at: now.toISOString(), volume_24h_usd: item.volume24hUsd }];
      });
      if (snapshots.length) {
        const { error } = await admin.from("marketplace_competition_volume_snapshots").insert(snapshots);
        if (error && error.code !== "23505") return NextResponse.json({ error: "Could not save competition volume snapshots." }, { status: 500 });
      }
      if (competition.status !== "active") await admin.from("marketplace_competitions").update({ status: "active" }).eq("id", competition.id);
      sampleResults.push({ competitionId: competition.id, snapshots: snapshots.length });
      continue;
    }

    const { data: snapshots, error: snapshotError } = await admin.from("marketplace_competition_volume_snapshots")
      .select("listing_id,sampled_at,volume_24h_usd")
      .eq("competition_id", competition.id).gte("sampled_at", competition.starts_at).lte("sampled_at", competition.ends_at)
      .order("sampled_at", { ascending: true });
    if (snapshotError) return NextResponse.json({ error: "Could not load historical competition snapshots." }, { status: 500 });
    if (!snapshots?.length) {
      await admin.from("marketplace_competitions").update({ status: "completed" }).eq("id", competition.id);
      sampleResults.push({ competitionId: competition.id, snapshots: 0 });
      continue;
    }
    const byListing = new Map<string, Snapshot[]>();
    for (const row of (snapshots ?? []) as Snapshot[]) byListing.set(row.listing_id, [...(byListing.get(row.listing_id) ?? []), row]);
    if ((entries as Entry[]).some((entry) => (byListing.get(entry.listing_id)?.length ?? 0) < 2)) {
      await admin.from("marketplace_competitions").update({ status: "completed" }).eq("id", competition.id);
      sampleResults.push({ competitionId: competition.id, snapshots: snapshots?.length ?? 0 });
      continue;
    }
    const scores = (entries as Entry[]).map((entry) => {
      const rows = byListing.get(entry.listing_id) ?? [];
      let score = 0;
      let previous: number | null = null;
      for (const row of rows) {
        const current = Number(row.volume_24h_usd);
        // Jupiter exposes rolling 24-hour volume, so score positive deltas between cron samples.
        if (previous !== null) score += current >= previous ? current - previous : current;
        previous = current;
      }
      return { ...entry, score: Number(score.toFixed(6)) };
    }).sort((a, b) => b.score - a.score || a.listing_id.localeCompare(b.listing_id)).slice(0, 3);
    const profiles = await admin.from("marketplace_profiles").select("owner_id,username,display_name").in("owner_id", scores.map((item) => item.owner_id));
    const displayNames = new Map((profiles.data ?? []).map((item) => [item.owner_id, item.display_name || item.username]));
    const resultRows = await Promise.all(scores.map(async (entry, index) => {
      const listingResult = await admin.from("agents").select("name").eq("id", entry.listing_id).maybeSingle();
      return { competition_id: competition.id, listing_id: entry.listing_id, listing_name: listingResult.data?.name ?? "Agent", owner_id: entry.owner_id, rank: index + 1, estimated_volume_usd: entry.score, scored_from: competition.starts_at, scored_through: competition.ends_at, calculated_at: now.toISOString() };
    }));
    if (resultRows.length) {
      const { error } = await admin.from("marketplace_competition_results").upsert(resultRows, { onConflict: "competition_id,rank" });
      if (error) return NextResponse.json({ error: "Could not record competition winners." }, { status: 500 });
      const winner = resultRows[0];
      await admin.from("marketplace_competitions").update({ status: "completed", winner_user_id: winner.owner_id, winner_display_name: displayNames.get(winner.owner_id) || winner.listing_name, winner_prize_usd: Number(competition.prize_pool_usd || 0) }).eq("id", competition.id);
    } else {
      await admin.from("marketplace_competitions").update({ status: "completed" }).eq("id", competition.id);
    }
    sampleResults.push({ competitionId: competition.id, snapshots: (snapshots ?? []).length });
  }
  return NextResponse.json({ ok: true, competitions: sampleResults.length, results: sampleResults, note: "Volume scores estimate competition-period trading from scheduled samples of Jupiter's rolling 24-hour volume." });
}

// Vercel Cron invokes scheduled routes with GET.
export async function GET(request: Request) {
  return POST(request);
}
