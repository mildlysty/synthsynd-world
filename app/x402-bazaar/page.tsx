"use client";

import { useCallback, useEffect, useState } from "react";
import X402Invoke from "../components/X402Invoke";

type Offer = { scheme?: string; network?: string; amount?: string; asset?: string; payTo?: string; extra?: { name?: string; version?: string } };
type Resource = {
  resource: string;
  type?: "http" | "mcp" | string;
  serviceName?: string;
  description?: string;
  tags?: string[];
  iconUrl?: string;
  accepts?: Offer[];
  quality?: { l30DaysTotalCalls?: number; l30DaysUniquePayers?: number; lastCalledAt?: string };
  extensions?: { bazaar?: { info?: { input?: { type?: string; method?: string; queryParams?: Record<string, unknown>; body?: Record<string, unknown>; toolName?: string; description?: string } } } };
};

function priceLabel(offer?: Offer) {
  if (!offer) return "Price shown by provider";
  const units = Number(offer.amount);
  const asset = offer.extra?.name || offer.asset || "token";
  if (!Number.isFinite(units)) return `Payment in ${asset}`;
  // Bazaar exposes token base units but not decimals. USDC uses six decimals;
  // for unknown assets, show the exact raw amount to avoid inventing a price.
  const amount = asset.toLowerCase().includes("usdc") ? (units / 1_000_000).toFixed(6).replace(/0+$/, "").replace(/\.$/, "") : `${offer.amount} base units`;
  return `${amount} ${asset}`;
}

function invokeSpec(resource: Resource) {
  const input = resource.extensions?.bazaar?.info?.input;
  const method = input?.type === "http" ? input.method || "GET" : "GET";
  const initialInput = method.toUpperCase() === "GET" || method.toUpperCase() === "HEAD" ? input?.queryParams : input?.body;
  return { method, initialInput: initialInput && typeof initialInput === "object" ? initialInput : undefined };
}

function resourceHost(value: string) {
  try { return new URL(value).hostname; } catch { return "Unknown service"; }
}

export default function X402BazaarPage() {
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [network, setNetwork] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [partial, setPartial] = useState(false);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: "20" });
    if (query) params.set("query", query);
    if (network) params.set("network", network);
    if (!query) params.set("offset", String(offset));
    try {
      const response = await fetch(`/api/x402/bazaar?${params}`, { signal, cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        const issue = new Error(body.error || "Could not load the x402 Bazaar.") as Error & { code?: string };
        issue.code = body.code;
        throw issue;
      }
      setResources(Array.isArray(body.resources) ? body.resources : body.items ?? []);
      setPartial(body.partialResults === true);
      setTotalCount(Number.isFinite(body.pagination?.total) ? body.pagination.total : 0);
    } catch (cause) {
      if (cause instanceof Error && cause.name !== "AbortError") {
        setError((cause as Error & { code?: string }).code === "CDP_NOT_CONFIGURED"
          ? "Add CDP_API_KEY_ID and CDP_API_KEY_SECRET to the server environment to enable live x402 Bazaar discovery."
          : cause.message);
      }
    } finally { setLoading(false); }
  }, [query, network, offset]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8"><div className="mx-auto max-w-6xl">
    <header className="rounded-3xl border border-cyan-900/60 bg-gradient-to-br from-cyan-950/50 via-zinc-950 to-purple-950/30 p-7 sm:p-10">
      <p className="text-sm font-medium text-cyan-300">Pay-per-request services</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">x402 Bazaar</h1>
      <p className="mt-3 max-w-2xl text-zinc-400">Search services registered in Coinbase’s x402 catalog. Review payment requirements before connecting your wallet; each service provider controls its API and response.</p>
      <form onSubmit={(event) => { event.preventDefault(); setOffset(0); setNetwork(""); setQuery(searchText.trim()); }} className="mt-7 flex max-w-3xl flex-col gap-3 sm:flex-row">
        <input value={searchText} onChange={(event) => setSearchText(event.target.value)} maxLength={400} placeholder="Search services, e.g. weather or market data" className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black/70 px-4 py-3 outline-none focus:border-cyan-500" />
        <select aria-label="Payment network" title={query ? "Filter by payment network" : "Enter a search before filtering by network"} disabled={!query} value={network} onChange={(event) => setNetwork(event.target.value)} className="rounded-xl border border-zinc-700 bg-black/70 px-3 py-3 text-sm disabled:opacity-50"><option value="">All networks</option><option value="eip155:8453">Base</option><option value="eip155:84532">Base Sepolia</option><option value="solana:mainnet">Solana</option></select>
        <button className="rounded-xl bg-cyan-700 px-5 py-3 font-semibold hover:bg-cyan-600">Search</button>
      </form>
    </header>

    <div className="mt-7 flex items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">{query ? `Results for “${query}”` : "Recently discovered services"}</h2>{!query && totalCount > 0 && <p className="mt-1 text-xs text-zinc-500">Showing {offset + 1}–{Math.min(offset + resources.length, totalCount)} of {totalCount.toLocaleString()}</p>}</div><button onClick={() => { setSearchText(""); setQuery(""); setNetwork(""); setOffset(0); }} className="text-sm text-cyan-300 hover:text-cyan-200">Browse all</button></div>
    {error && <div role="alert" className="mt-5 rounded-xl border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-200">{error}</div>}
    {loading ? <p className="mt-6 text-sm text-zinc-500">Loading x402 services…</p> : !error && resources.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">No x402 services matched this search.</div> : (
      <div className="mt-5 grid gap-4 lg:grid-cols-2">{resources.map((resource, index) => {
        const spec = invokeSpec(resource);
        const primaryOffer = resource.accepts?.[0];
        const input = resource.extensions?.bazaar?.info?.input;
        return <article key={`${resource.resource}:${index}`} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex gap-4">{resource.iconUrl ? <img src={resource.iconUrl} alt="" className="h-12 w-12 rounded-xl bg-zinc-900 object-cover" /> : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-cyan-950 text-xl text-cyan-300">◇</div>}
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{resource.serviceName || resource.description || resourceHost(resource.resource)}</h3><span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase text-zinc-400">{resource.type || "HTTP"}</span></div>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-400">{resource.description || input?.description || "x402-protected resource"}</p>
              <a href={resource.resource} target="_blank" rel="noreferrer" className="mt-2 block truncate font-mono text-xs text-cyan-300 hover:underline">{resource.resource}</a>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-zinc-800 pt-4 text-xs text-zinc-500"><span>Offer: <b className="font-medium text-zinc-300">{priceLabel(primaryOffer)}</b></span><span>Network: <b className="font-medium text-zinc-300">{primaryOffer?.network || "provider-selected"}</b></span><span>Method: <b className="font-medium text-zinc-300">{input?.method || input?.toolName || "HTTP"}</b></span>{resource.quality?.l30DaysTotalCalls != null && <span>30-day calls: {resource.quality.l30DaysTotalCalls.toLocaleString()}</span>}</div>
          {resource.tags?.length ? <div className="mt-3 flex flex-wrap gap-1.5">{resource.tags.slice(0, 6).map((tag) => <span key={tag} className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] text-zinc-400">{tag}</span>)}</div> : null}
          {resource.type !== "mcp" && <details className="mt-4 border-t border-zinc-800 pt-3"><summary className="cursor-pointer text-sm font-medium text-cyan-300">Review and invoke service</summary><X402Invoke endpoint={resource.resource} initialMethod={spec.method} initialInput={spec.initialInput} /></details>}
        </article>;
      })}</div>
    )}
    {partial && <p className="mt-4 text-xs text-zinc-500">The Bazaar returned a partial result set. Refine your search to find other services.</p>}
    {!loading && !query && totalCount > 20 && <nav aria-label="Bazaar catalog pages" className="mt-6 flex items-center justify-between"><button type="button" onClick={() => setOffset(Math.max(0, offset - 20))} disabled={offset === 0} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm disabled:opacity-40">Previous</button><button type="button" onClick={() => setOffset(offset + 20)} disabled={offset + 20 >= totalCount} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm disabled:opacity-40">Next</button></nav>}
    <p className="mt-5 text-xs leading-5 text-zinc-600">Catalog metadata comes from Coinbase CDP. A browser wallet is used for payment; private keys are never requested by this app. Never sign a payment you do not recognize.</p>
  </div></main>;
}
