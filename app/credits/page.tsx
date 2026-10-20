"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

type Transaction = { id: string; amount: number; kind: string; created_at: string };
export default function CreditsPage() {
  const [token, setToken] = useState("");
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState("10");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    setToken(data.session.access_token);
    const [account, history] = await Promise.all([
      supabase.from("marketplace_credit_accounts").select("balance").eq("owner_id", data.session.user.id).maybeSingle(),
      supabase.from("marketplace_credit_transactions").select("id,amount,kind,created_at").eq("owner_id", data.session.user.id).order("created_at", { ascending: false }).limit(25),
    ]);
    if (account.error || history.error) setError("Credit wallet is not ready. Apply the SQL migrations first.");
    setBalance(Number(account.data?.balance || 0)); setTransactions(history.data || []);
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function addCredits(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      if (!token) throw new Error("Sign in to add credits.");
      const response = await fetch("/api/stripe/credits", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ amount: Number(amount) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not start credit checkout.");
      window.location.assign(result.url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add credits."); setBusy(false); }
  }
  useEffect(() => { if (new URLSearchParams(window.location.search).get("checkout") === "success") { setNotice("Checkout returned. Credits appear after Stripe confirms payment; refresh in a moment."); void load(); } }, [load]);
  return <main className="mx-auto max-w-5xl px-5 py-12 text-zinc-100"><Link href="/pricing" className="text-sm text-purple-300">← Plans & pricing</Link><h1 className="mt-5 text-4xl font-bold">API credits</h1><p className="mt-3 text-zinc-400">One US dollar adds one credit. Credits are billed for prompt runs at the configured per-run amount.</p>
    <section className="mt-7 grid gap-5 md:grid-cols-[1fr_1fr]"><article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"><p className="text-sm text-zinc-500">Available balance</p><p className="mt-2 text-4xl font-bold">{balance.toFixed(2)} <span className="text-base font-normal text-zinc-500">credits</span></p><button onClick={() => void load()} className="mt-4 text-sm text-purple-300">Refresh balance</button></article>
      <form onSubmit={addCredits} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"><label className="block text-sm text-zinc-300">Top up (USD)<input type="number" min="5" max="500" step="0.01" required value={amount} onChange={(e)=>setAmount(e.target.value)} className="mt-2 block w-full rounded-xl border border-zinc-700 bg-black px-3 py-3" /></label><p className="mt-2 text-xs text-zinc-500">Minimum $5; maximum $500 per checkout.</p><button disabled={busy || !token} className="mt-5 w-full rounded-xl bg-purple-600 px-4 py-3 font-semibold disabled:opacity-50">{busy ? "Opening Stripe…" : token ? "Add credits" : "Sign in to add credits"}</button></form>
    </section>
    {error && <p role="alert" className="mt-5 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}{notice && <p role="status" className="mt-5 rounded-xl border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-200">{notice}</p>}
    <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6"><h2 className="text-lg font-semibold">Recent activity</h2>{!transactions.length?<p className="mt-4 text-sm text-zinc-500">No credit activity yet.</p>:<div className="mt-4 divide-y divide-zinc-800">{transactions.map((item)=><div key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="capitalize text-zinc-300">{item.kind.replaceAll("_"," ")}</span><span className={item.amount >= 0 ? "text-emerald-300" : "text-amber-300"}>{item.amount >= 0 ? "+" : ""}{Number(item.amount).toFixed(2)}</span><time className="text-zinc-600">{new Date(item.created_at).toLocaleString()}</time></div>)}</div>}</section>
  </main>;
}
