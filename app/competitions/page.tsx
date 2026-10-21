"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import CompetitionJoin from "../components/CompetitionJoin";

type Competition = {
  id: string; slug: string; title: string; description: string; prize_pool_usd: number;
  starts_at: string; ends_at: string; status: "upcoming" | "active" | "completed";
  ranking_metric: string; winner_display_name: string | null; winner_prize_usd: number | null;
};
type Entry = { competition_id: string; listing_id: string; owner_id: string; status: string };
type MarketItem = { id: string; name: string; owner_id: string; token_symbol: string | null; marketCapUsd: number | null; volume24hUsd: number | null };
type CompetitionResult = { competition_id: string; listing_id: string; listing_name: string; rank: number; estimated_volume_usd: number };

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});
  const [entries, setEntries] = useState<Entry[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);

  useEffect(() => {
    let active = true;
    supabase.from("marketplace_competitions")
      .select("id,slug,title,description,prize_pool_usd,starts_at,ends_at,status,ranking_metric,winner_display_name,winner_prize_usd")
      .order("starts_at", { ascending: false })
      .then(async ({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError("Competition data is not configured yet. Apply the marketplace database migration to enable this page.");
        else {
          const rows = (data ?? []) as Competition[];
          setCompetitions(rows);
          if (rows.length) {
            const { data: scoredResults } = await supabase.from("marketplace_competition_results").select("competition_id,listing_id,listing_name,rank,estimated_volume_usd").in("competition_id", rows.map((item) => item.id)).order("rank", { ascending: true });
            if (active && scoredResults) setResults(scoredResults as CompetitionResult[]);
            const { data: rowsOfEntries } = await supabase.from("marketplace_competition_entries").select("competition_id,listing_id,owner_id,status").in("competition_id", rows.map((item) => item.id));
            if (active) {
              setEntries((rowsOfEntries ?? []) as Entry[]);
              setEntryCounts((rowsOfEntries ?? []).reduce((counts, row) => ({ ...counts, [row.competition_id]: (counts[row.competition_id] || 0) + 1 }), {} as Record<string, number>));
              fetch("/api/solana/market-data", { cache: "no-store" }).then(response => response.json()).then(body => {
                if (active && Array.isArray(body.items)) setMarketItems(body.items as MarketItem[]);
              }).catch(() => undefined);
            }
          }
        }
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const active = competitions.filter((competition) => competition.status === "active" || competition.status === "upcoming");
  const past = competitions.filter((competition) => competition.status === "completed");
  const date = (value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8"><div className="mx-auto max-w-6xl">
    <header className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-zinc-950 to-zinc-950 p-8 sm:p-12">
      <p className="text-sm font-medium text-amber-300">Build · launch · compete</p><h1 className="mt-2 text-4xl font-bold tracking-tight">Competitions</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">Challenges and prize pools for creators. Eligible listings show current Jupiter 24-hour market snapshots; organizers still verify winners and handle prize payouts.</p>
      <Link href="/frenzy" className="mt-6 inline-flex rounded-xl bg-amber-400 px-4 py-2.5 font-semibold text-black">Explore Frenzy listings</Link>
    </header>
    {error && <p role="alert" className="mt-6 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
    <section className="mt-9"><h2 className="mb-4 text-xl font-semibold">Active and upcoming</h2>
      {loading ? <p className="text-zinc-500">Loading competitions…</p> : !error && active.length === 0 ? <p className="rounded-2xl border border-zinc-800 p-8 text-zinc-500">No active competitions are published.</p> :
        <div className="grid gap-4 lg:grid-cols-2">{active.map((competition) => <article key={competition.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex items-center justify-between"><span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase text-amber-300">{competition.status}</span><span className="text-xs text-zinc-500">{date(competition.starts_at)} – {date(competition.ends_at)}</span></div>
          <h3 className="mt-5 text-2xl font-bold">{competition.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{competition.description}</p>
          <div className="mt-6 flex justify-between border-t border-zinc-800 pt-5"><span className="text-sm text-zinc-500">Prize pool</span><span className="text-xl font-bold">${Number(competition.prize_pool_usd).toLocaleString()}</span></div>
          <p className="mt-3 text-xs text-zinc-600">Ranking: {competition.ranking_metric.replaceAll("_", " ")} · {entryCounts[competition.id] || 0} entries</p>
          <CompetitionLeaderboard competition={competition} entries={entries} marketItems={marketItems} />
          <CompetitionJoin competitionId={competition.id} endsAt={competition.ends_at} />
        </article>)}</div>}
    </section>
    <section className="mt-12"><h2 className="mb-4 text-xl font-semibold">Past competitions</h2>
      {!loading && !error && past.length === 0 ? <p className="rounded-2xl border border-zinc-800 p-8 text-zinc-500">Past results will appear here after competitions are completed.</p> : <div className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800">{past.map((competition)=><div key={competition.id} className="bg-zinc-950 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="font-semibold">{competition.title}</h3><p className="mt-1 text-sm text-zinc-500">Winner: {competition.winner_display_name || "Not recorded"} · {date(competition.ends_at)}</p></div><span className="font-semibold text-emerald-300">${Number(competition.winner_prize_usd ?? competition.prize_pool_usd).toLocaleString()} prize pool</span></div><div className="mt-4 space-y-2">{results.filter((result) => result.competition_id === competition.id).map((result) => <p key={result.listing_id} className="flex justify-between gap-4 rounded-lg bg-black/40 px-3 py-2 text-sm"><span className="text-zinc-300">#{result.rank} {result.listing_name || `Listing ${result.listing_id.slice(0, 8)}`}</span><span className="text-zinc-500">~${Number(result.estimated_volume_usd).toLocaleString(undefined, { maximumFractionDigits: 2 })} estimated volume</span></p>)}{!results.some((result) => result.competition_id === competition.id) && <p className="text-xs text-zinc-600">Historical results have not been scored yet.</p>}</div></div>)}</div>}
    </section>
  </div></main>;
}

function CompetitionLeaderboard({ competition, entries, marketItems }: { competition: Competition; entries: Entry[]; marketItems: MarketItem[] }) {
  if (competition.ranking_metric !== "volume" && competition.ranking_metric !== "market_cap") return <p className="mt-3 text-xs text-zinc-600">This ranking metric needs its own reporting source.</p>;
  const ranked = entries.filter(entry => entry.competition_id === competition.id && entry.status !== "disqualified").flatMap(entry => {
    const item = marketItems.find(market => market.id === entry.listing_id);
    const score = competition.ranking_metric === "volume" ? item?.volume24hUsd : item?.marketCapUsd;
    return item && score != null ? [{ entry, item, score }] : [];
  }).sort((a, b) => b.score - a.score).slice(0, 5);
  return <div className="mt-4 rounded-xl border border-zinc-800 bg-black/30 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Current {competition.ranking_metric === "volume" ? "24h volume" : "market cap"} leaderboard</p>
    {ranked.length ? <ol className="mt-3 space-y-2">{ranked.map((row, index) => <li key={row.entry.listing_id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate text-zinc-300">{index + 1}. {row.item.token_symbol ? `$${row.item.token_symbol}` : row.item.name}<span className="ml-2 text-xs text-zinc-600">creator {row.entry.owner_id.slice(0, 8)}…</span></span><span className="shrink-0 font-medium text-emerald-300">${Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(row.score)}</span></li>)}</ol> : <p className="mt-3 text-sm text-zinc-600">Market data for entered tokens is not indexed yet.</p>}
    <p className="mt-3 text-[11px] text-zinc-600">Indicative current snapshot only; this does not reconstruct the competition-period result.</p>
  </div>;
}
