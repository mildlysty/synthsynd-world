"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  name: string;
  statusType: string | null;
  token_address: string | null;
  token_symbol: string | null;
  price_usd: number | null;
  created_at: string | null;
  usdPrice: number | null;
  priceChange24h: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  traders24h: number | null;
};

const filters = ["All", "Agents", "Prompts", "Trading", "New"] as const;
type Filter = (typeof filters)[number];
const money = (value: number | null | undefined) => value == null ? "—" : value < 0.01 && value > 0 ? `$${value.toExponential(2)}` : `$${value.toLocaleString(undefined, { maximumFractionDigits: value < 1 ? 6 : 2 })}`;
const compactMoney = (value: number | null | undefined) => value == null ? "—" : `$${Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(value)}`;

export default function ScreenerPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/solana/market-data", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load listings.");
        setItems(body.items ?? []);
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name !== "AbortError") {
          setError(reason.message || "Could not load listings.");
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const tokenized = useMemo(() => items.filter((item) => item.token_address), [items]);
  const visible = tokenized.filter((item) => {
    if (filter === "All") return true;
    if (filter === "Trading") return Number(item.volume24hUsd) > 0;
    if (filter === "New") {
      return item.created_at && Date.now() - new Date(item.created_at).getTime() < 7 * 86400000;
    }
    return item.statusType?.toLowerCase() === filter.slice(0, -1).toLowerCase();
  });

  return (
    <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm font-medium text-cyan-300">Market overview</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Token Screener</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Filter tokenized listings with live price, 24-hour market cap, volume, and trader data.
          </p>
        </header>

        <div className="mt-8 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              aria-pressed={filter === item}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                filter === item
                  ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
        <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
              <tr>{["Token", "Type", "Price", "24h", "Market cap", "Volume", "Traders"].map((heading) => <th key={heading} className="px-5 py-4 font-medium">{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950">
              {visible.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-900/60">
                  <td className="px-5 py-4">
                    <div className="font-semibold">{item.token_symbol || item.name}</div>
                    <div className="mt-1 font-mono text-xs text-zinc-600">{item.token_address?.slice(0, 5)}…{item.token_address?.slice(-5)}</div>
                  </td>
                  <td className="px-5 py-4 capitalize text-zinc-400">{item.statusType || "—"}</td>
                  <td className="px-5 py-4">{money(item.usdPrice)}</td>
                  <td className={`px-5 py-4 ${Number(item.priceChange24h) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{item.priceChange24h == null ? "—" : `${item.priceChange24h > 0 ? "+" : ""}${item.priceChange24h.toFixed(2)}%`}</td>
                  <td className="px-5 py-4">{compactMoney(item.marketCapUsd)}</td>
                  <td className="px-5 py-4">{compactMoney(item.volume24hUsd)}</td>
                  <td className="px-5 py-4">{item.traders24h?.toLocaleString() ?? "—"}</td>
                </tr>
              ))}
              {!loading && !error && visible.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-zinc-500">No tokenized listings match this filter.</td></tr>
              )}
              {loading && <tr><td colSpan={7} className="px-5 py-12 text-center text-zinc-500">Loading tokenized listings…</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-600">Market data comes from Jupiter Tokens V2 and is briefly cached. Illiquid or unindexed tokens may have blank metrics.</p>
      </div>
    </main>
  );
}
