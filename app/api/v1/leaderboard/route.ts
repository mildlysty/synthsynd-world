import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkApiKeyQuota } from "../../_lib/api-key-quota";

export async function GET(request: Request) {
  const quota = await checkApiKeyQuota(request);
  if (quota.error) return quota.error;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Marketplace data is not configured." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const counts = new Map<string, number>();
  const pageSize = 1000;
  let offset = 0;
  let totalVisible = 0;

  while (offset < 20000) {
    const { data, count, error } = await supabase
      .from("agents")
      .select("owner_id,user_id", { count: offset === 0 ? "exact" : undefined })
      .range(offset, offset + pageSize - 1);
    if (error) return NextResponse.json({ error: "Could not load creator listings." }, { status: 500 });
    if (offset === 0) totalVisible = count ?? 0;
    for (const row of data ?? []) {
      const creatorId = row.owner_id ?? row.user_id;
      if (creatorId) counts.set(creatorId, (counts.get(creatorId) ?? 0) + 1);
    }
    if (!data || data.length < pageSize) break;
    offset += pageSize;
  }

  const leaders = Array.from(counts, ([creatorId, itemCount]) => ({ creatorId, itemCount }))
    .sort((a, b) => b.itemCount - a.itemCount)
    .slice(0, 25);
  const creatorIds = leaders.map((leader) => leader.creatorId);
  const { data: profiles } = creatorIds.length
    ? await supabase.from("profiles").select("wallet_address,username").in("wallet_address", creatorIds)
    : { data: [] };
  const { data: marketplaceProfiles } = creatorIds.length
    ? await supabase.from("marketplace_profiles").select("owner_id,username").in("owner_id", creatorIds)
    : { data: [] };
  const usernames = new Map<string, string>([
    ...(profiles ?? []).map((profile) => [profile.wallet_address, profile.username] as [string, string]),
    ...(marketplaceProfiles ?? []).map((profile) => [profile.owner_id, profile.username] as [string, string]),
  ]);

  return NextResponse.json({
    creators: leaders.map((leader, index) => ({
      rank: index + 1,
      user_id: leader.creatorId,
      username: usernames.get(leader.creatorId) ?? null,
      item_count: leader.itemCount,
    })),
    total_items_seen: Math.min(totalVisible, 20000),
    complete: totalVisible <= 20000,
  });
}
