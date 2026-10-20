"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type TokenItem = { id: string; name: string; token_address: string; token_symbol: string | null; statusType: string | null; fee_selection: string | null; usdPrice: number | null; marketCapUsd: number | null };

export default function AgentEconomyPage() {
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/solana/market-data", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { const body=await response.json(); if(!response.ok) throw new Error(body.detail||body.error||"Could not load token listings."); setTokens((body.items||[]).filter((item: TokenItem)=>item.token_address)); })
      .catch((reason: unknown)=>{ if(reason instanceof Error&&reason.name!=="AbortError") setError(reason.message); })
      .finally(()=>setLoading(false));
    return ()=>controller.abort();
  }, []);

  return <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8"><div className="mx-auto max-w-6xl">
    <p className="text-sm font-medium text-cyan-300">Tokenized listings</p><h1 className="mt-2 text-4xl font-bold">Agent economy</h1>
    <p className="mt-3 max-w-2xl text-zinc-400">Explore tokenized marketplace products with current prices and market capitalization.</p>
    {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
    <section className="mt-7 overflow-hidden rounded-2xl border border-zinc-800"><div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 bg-zinc-900 px-5 py-3 text-xs uppercase tracking-wide text-zinc-500"><span>Listing</span><span>Fee tier</span><span>Price</span><span>Market cap</span></div>
      {loading?<p className="p-8 text-zinc-500">Loading tokenized products…</p>:!error&&tokens.length===0?<p className="p-8 text-zinc-500">No tokenized listings found.</p>:tokens.map((token)=><div key={token.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-t border-zinc-800 bg-zinc-950 px-5 py-4"><div><Link href={`/agent/${token.id}`} className="font-semibold hover:text-purple-200">{token.token_symbol?`$${token.token_symbol}`:token.name}</Link><p className="mt-1 text-xs text-zinc-600">{token.name} · {token.statusType||"listing"}</p></div><span className="text-sm text-zinc-400">{token.fee_selection==="frenzy"?"Frenzy":"Standard"}</span><span className="text-sm text-zinc-300">{token.usdPrice == null ? "—" : `$${token.usdPrice.toPrecision(5)}`}</span><span className="text-sm text-zinc-300">{token.marketCapUsd == null ? "—" : `$${Intl.NumberFormat(undefined,{notation:"compact",maximumFractionDigits:2}).format(token.marketCapUsd)}`}</span></div>)}
    </section>
    <p className="mt-3 text-xs text-zinc-600">Showing up to 100 latest listings. Jupiter omits metrics for tokens without reliable or recent trading data.</p>
  </div></main>;
}
