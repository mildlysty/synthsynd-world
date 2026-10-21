"use client";

import { useEffect, useState } from "react";
import CreatorFeeClaim from "../components/CreatorFeeClaim";
import { supabase } from "../../utils/supabase";

type FeeItem = { listingId: string; name: string; mint: string; creatorWallet: string | null; unclaimed?: string; total?: string; quoteDecimals?: number; error?: string };
type FeeSummary = { ownerId: string; items: FeeItem[]; unclaimed: string; total: string; quoteDecimals: number };

function amount(raw: string | undefined, decimals = 6) {
  if (!raw) return "—";
  const value = Number(raw) / 10 ** decimals;
  return Number.isFinite(value) ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : "—";
}

export default function FeeDashboard() {
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sign in to view your creator trading fees.");
      const response = await fetch("/api/solana/fees", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load creator fees.");
      setSummary(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load creator fees."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);

  return <section className="mt-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold">Jupiter creator trading fees</h2><p className="mt-1 text-sm text-zinc-400">Aggregated balances across token launches owned by your account.</p></div><button type="button" onClick={refresh} disabled={loading} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm disabled:opacity-50">{loading ? "Refreshing…" : "Refresh balances"}</button></div>
    {error && <p role="alert" className="mt-4 rounded-xl border border-amber-900 bg-amber-950/30 p-4 text-sm text-amber-200">{error}</p>}
    {summary && <div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">Available to claim</p><p className="mt-2 text-3xl font-bold">${amount(summary.unclaimed, summary.quoteDecimals)} USDC</p></div><div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><p className="text-xs uppercase tracking-wide text-zinc-500">Total creator earnings</p><p className="mt-2 text-3xl font-bold">${amount(summary.total, summary.quoteDecimals)} USDC</p></div></div>}
    {summary?.items.length === 0 && <p className="mt-5 rounded-xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">No tokenized listings are linked to your account yet.</p>}
    <div className="mt-5 space-y-4">{summary?.items.map((item) => <article key={item.listingId} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{item.name}</h3><p className="mt-1 font-mono text-xs text-zinc-500">{item.mint}</p></div><div className="text-right"><p className="text-xs text-zinc-500">Unclaimed</p><p className="font-semibold">{item.unclaimed ? `$${amount(item.unclaimed)} USDC` : item.error || "Unavailable"}</p></div></div>{item.creatorWallet && summary.ownerId ? <CreatorFeeClaim listingId={item.listingId} creatorId={summary.ownerId} creatorWallet={item.creatorWallet} onClaimed={refresh} /> : <p className="mt-3 text-sm text-amber-300">This listing is missing its recorded token creator wallet.</p>}</article>)}</div>
  </section>;
}
