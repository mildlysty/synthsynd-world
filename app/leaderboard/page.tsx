"use client";

import { useEffect, useState } from "react";

type Creator = { rank: number; user_id: string; username: string | null; item_count: number };

export default function LeaderboardPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [complete, setComplete] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/leaderboard", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load the leaderboard.");
        setCreators(body.creators ?? []);
        setComplete(Boolean(body.complete));
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name !== "AbortError") setError(reason.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 to-zinc-950 p-8 sm:p-12">
          <p className="text-sm font-medium text-violet-300">Creator economy</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Leaderboard</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">Creators are ranked by published marketplace items.</p>
          <p className="mt-5 max-w-2xl text-xs leading-5 text-zinc-500">
            Trading volume is not stored in the current app database, so this ranking uses item count. Connect a verified on-chain indexer before displaying volume or earnings.
          </p>
        </header>

        {error && <p role="alert" className="mt-6 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
        <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-800">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h2 className="font-semibold">Top creators</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500"><tr>{["Rank", "Creator", "Items published", "Trading volume"].map((heading) => <th key={heading} className="px-5 py-4 font-medium">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-zinc-800">
                {creators.map((creator) => <tr key={creator.user_id} className="bg-zinc-950 hover:bg-zinc-900/60">
                  <td className="px-5 py-4 font-mono text-zinc-500">#{creator.rank}</td>
                  <td className="px-5 py-4"><div className="font-semibold">{creator.username ? `@${creator.username}` : `${creator.user_id.slice(0, 6)}…${creator.user_id.slice(-4)}`}</div><div className="mt-1 font-mono text-xs text-zinc-600">{creator.user_id}</div></td>
                  <td className="px-5 py-4">{creator.item_count}</td>
                  <td className="px-5 py-4 text-zinc-500">Not indexed</td>
                </tr>)}
                {!loading && !error && creators.length === 0 && <tr><td colSpan={4} className="px-5 py-12 text-center text-zinc-500">No creator listings to rank yet.</td></tr>}
                {loading && <tr><td colSpan={4} className="px-5 py-12 text-center text-zinc-500">Loading creator data…</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        {!complete && <p className="mt-3 text-xs text-amber-300">Ranking was calculated from the first 20,000 visible items; older rows were not included.</p>}
      </div>
    </main>
  );
}
