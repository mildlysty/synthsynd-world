"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  name: string;
  statusType: string | null;
  token_address: string | null;
  token_symbol: string | null;
  fee_selection: string | null;
  created_at: string | null;
  usdPrice: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  traders24h: number | null;
};

const compact = (value: number | null | undefined) => value == null ? "—" : `$${Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(value)}`;

export default function FrenzyPage() {
  const router = useRouter();
  const [kind, setKind] = useState<"agent" | "prompt">("agent");
  const [name, setName] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/solana/market-data", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load token listings.");
        const tokenItems = (body.items ?? []).filter((item: Item) =>
          item.token_address && item.fee_selection === "frenzy"
        );
        setItems(tokenItems);
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name !== "AbortError") setError(reason.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams({ type: kind, name: name.trim() });
    router.push(`/create?${params.toString()}`);
  }

  return (
    <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-950/60 via-zinc-900 to-zinc-950 p-7 sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">Token launchpad</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">Launch in Frenzy Mode</h1>
          <p className="mt-4 max-w-2xl text-zinc-300">
            Publish an agent or prompt listing, then launch it through your connected Solana wallet.
            Explore Frenzy listings with current Jupiter market metrics below.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4 rounded-2xl border border-zinc-700 bg-zinc-950/80 p-4 sm:grid-cols-[1fr_auto_auto]">
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-zinc-400">Product name</span>
              <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Nova Research Agent" className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-orange-400" />
            </label>
            <div>
              <span className="mb-2 block text-xs font-medium text-zinc-400">Product type</span>
              <div className="flex rounded-xl border border-zinc-700 bg-zinc-900 p-1">
                {(["agent", "prompt"] as const).map((option) => (
                  <button key={option} type="button" onClick={() => setKind(option)} aria-pressed={kind === option} className={`rounded-lg px-4 py-2 text-sm capitalize ${kind === option ? "bg-orange-500 font-semibold text-black" : "text-zinc-400"}`}>
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <button className="self-end rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-black transition hover:bg-orange-400">Continue to publish</button>
          </form>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-sm text-orange-400">Marketplace listings</p><h2 className="mt-1 text-2xl font-bold">Frenzy tokens</h2></div>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">{items.length} indexed</span>
          </div>
          {error && <p role="alert" className="mb-4 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500"><tr>{["Token", "Type", "Price", "MCAP", "Volume", "Traders"].map((heading) => <th key={heading} className="px-5 py-4 font-medium">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-950">
                {items.map((item) => <tr key={item.id} className="hover:bg-zinc-900/60"><td className="px-5 py-4"><div className="font-semibold">{item.token_symbol || item.name}</div><div className="mt-1 font-mono text-xs text-zinc-600">{item.token_address?.slice(0, 5)}…{item.token_address?.slice(-5)}</div></td><td className="px-5 py-4 capitalize text-zinc-400">{item.statusType || "—"}</td><td className="px-5 py-4">{item.usdPrice == null ? "—" : `$${item.usdPrice.toPrecision(5)}`}</td><td className="px-5 py-4">{compact(item.marketCapUsd)}</td><td className="px-5 py-4">{compact(item.volume24hUsd)}</td><td className="px-5 py-4">{item.traders24h?.toLocaleString() ?? "—"}</td></tr>)}
                {!loading && !error && items.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-zinc-500">No Frenzy token listings found.</td></tr>}
                {loading && <tr><td colSpan={6} className="px-5 py-12 text-center text-zinc-500">Loading listings…</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-zinc-600">Listings are loaded from Supabase; market statistics come from Jupiter Tokens V2. Newly launched or illiquid tokens may not yet have indexed metrics.</p>
        </section>
      </div>
    </main>
  );
}
