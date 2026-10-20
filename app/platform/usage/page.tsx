"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../utils/supabase";

type UsageRow = { id: number; endpoint: string; method: string; status_code: number; created_at: string };

export default function UsagePage() {
  const [signedIn, setSignedIn] = useState(false);
  const [requestCount, setRequestCount] = useState<number | null>(null);
  const [activeKeys, setActiveKeys] = useState<number | null>(null);
  const [recent, setRecent] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth } = await supabase.auth.getSession();
      if (!active) return;
      if (!auth.session) { setSignedIn(false); setLoading(false); return; }
      setSignedIn(true);
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [usageResult, keysResult] = await Promise.all([
        supabase.from("marketplace_api_usage").select("id,endpoint,method,status_code,created_at", { count: "exact" }).gte("created_at", since).order("created_at", { ascending: false }).limit(100),
        supabase.from("marketplace_api_keys").select("id", { count: "exact", head: true }).is("revoked_at", null),
      ]);
      if (!active) return;
      if (usageResult.error || keysResult.error) {
        setError("Usage storage is unavailable. Apply the account and usage migration, then reload this page.");
      } else {
        setRequestCount(usageResult.count ?? 0);
        setActiveKeys(keysResult.count ?? 0);
        setRecent(usageResult.data ?? []);
      }
      setLoading(false);
    }
    load().catch(() => { if (active) { setError("Could not load account usage."); setLoading(false); } });
    return () => { active = false; };
  }, []);

  const endpointCounts = recent.reduce<Record<string, number>>((counts, row) => {
    counts[row.endpoint] = (counts[row.endpoint] ?? 0) + 1;
    return counts;
  }, {});

  return <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8"><div className="mx-auto max-w-6xl">
    <p className="text-sm font-medium text-cyan-300">Developer account</p><h1 className="mt-2 text-4xl font-bold">API usage</h1>
    <p className="mt-3 max-w-2xl text-zinc-400">Usage counts successful requests made with Synthsynd API keys over the last 30 days.</p>
    {error && <p role="alert" className="mt-6 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
    {loading ? <p className="mt-8 text-zinc-500">Loading usage…</p> : !signedIn ? <div className="mt-8 rounded-xl border border-zinc-800 p-6">Sign in to view usage. <Link href="/signin" className="ml-2 text-purple-300 underline">Sign in</Link></div> : !error && <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"><p className="text-sm text-zinc-500">Requests · last 30 days</p><p className="mt-2 text-4xl font-bold">{requestCount}</p></div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"><p className="text-sm text-zinc-500">Active API keys</p><p className="mt-2 text-4xl font-bold">{activeKeys}</p><Link href="/api-keys" className="mt-3 inline-block text-sm text-purple-300">Manage keys →</Link></div>
      </div>
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"><h2 className="font-semibold">Most used endpoints</h2><div className="mt-4 space-y-3">{Object.entries(endpointCounts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([endpoint,count])=><div key={endpoint} className="flex justify-between gap-4 border-b border-zinc-800 pb-2 text-sm"><code className="text-zinc-300">{endpoint}</code><span className="text-zinc-500">{count}</span></div>)}{recent.length===0&&<p className="text-sm text-zinc-500">No API-key requests recorded yet.</p>}</div></div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"><h2 className="font-semibold">Recent requests</h2><div className="mt-4 space-y-3">{recent.slice(0,8).map((row)=><div key={row.id} className="flex justify-between gap-4 border-b border-zinc-800 pb-2 text-sm"><span className="min-w-0 truncate"><code className="text-zinc-300">{row.method} {row.endpoint}</code><time className="mt-1 block text-xs text-zinc-600">{new Date(row.created_at).toLocaleString()}</time></span><span className={row.status_code<400?"text-emerald-300":"text-rose-300"}>{row.status_code}</span></div>)}{recent.length===0&&<p className="text-sm text-zinc-500">No API-key requests recorded yet.</p>}</div></div>
      </section>
    </>}
  </div></main>;
}
