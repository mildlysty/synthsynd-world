"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

type Plan = { plan_code: string; status: string; current_period_end: string | null; cancel_at_period_end: boolean };
const plans = [
  { id: "free", name: "Free", price: "$0", period: "forever", description: "Explore and publish marketplace listings.", features: ["Marketplace access", "Free listing publication", "Each API key: 60 requests/minute, 10,000/month", "Buy paid listings"] },
  { id: "pro", name: "Pro", price: "$19.99", period: "/ month", description: "For creators and builders who need more platform features.", features: ["Everything in Free", "Verified creator badge", "Priority support", "Each API key: 120 requests/minute, 100,000/month"] },
  { id: "premium", name: "Premium", price: "$1,020", period: "/ year", description: "Higher capacity for teams running marketplace workflows.", features: ["Everything in Pro", "Premium account status", "Each API key: 300 requests/minute, 1,000,000/month", "Enhanced support"] },
];

export default function PricingPage() {
  const [sessionToken, setSessionToken] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session) return;
      setSessionToken(session.access_token);
      const { data: subscription } = await supabase.from("marketplace_subscriptions").select("plan_code,status,current_period_end,cancel_at_period_end").eq("owner_id", session.user.id).maybeSingle();
      if (subscription) setPlan(subscription);
    });
  }, []);
  async function action(path: string, body?: unknown) {
    setBusy(true); setError("");
    try {
      if (!sessionToken) { window.location.assign("/signin?next=/pricing"); return; }
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` }, body: JSON.stringify(body || {}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Billing request failed.");
      window.location.assign(result.url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Billing request failed."); setBusy(false); }
  }
  return <main className="mx-auto max-w-7xl px-5 py-12 text-zinc-100 sm:px-8">
    <header className="mx-auto max-w-3xl text-center"><p className="text-sm font-semibold uppercase tracking-wider text-cyan-300">Plans & marketplace fees</p><h1 className="mt-3 text-4xl font-bold sm:text-5xl">Build, publish, and grow</h1><p className="mt-4 leading-7 text-zinc-400">Publishing is free. Paid listings are priced by creators; Stripe checkout currently charges a configurable marketplace fee. Subscription billing requires your Stripe recurring-price IDs.</p></header>
    {plan && <section className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div><p className="text-xs uppercase tracking-wide text-zinc-500">Your plan</p><p className="mt-1 font-semibold">{plan.plan_code.toUpperCase()} · {plan.status}{plan.current_period_end ? ` · renews/ends ${new Date(plan.current_period_end).toLocaleDateString()}` : ""}</p></div><button disabled={busy} onClick={() => action("/api/stripe/billing-portal")} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">Manage billing</button></section>}
    {error && <p role="alert" className="mx-auto mt-6 max-w-3xl rounded-xl border border-rose-900 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</p>}
    <section className="mt-10 grid gap-5 md:grid-cols-3">{plans.map((item) => <article key={item.id} className={`flex flex-col rounded-3xl border ${item.id === "pro" ? "border-purple-500/60 bg-purple-950/20" : "border-zinc-800 bg-zinc-950"} p-6`}><p className="text-sm font-semibold text-cyan-300">{item.name}</p><h2 className="mt-3 text-3xl font-bold">{item.price}<span className="ml-2 text-sm font-normal text-zinc-500">{item.period}</span></h2><p className="mt-3 min-h-12 text-sm text-zinc-400">{item.description}</p><ul className="mt-6 flex-1 space-y-3 text-sm text-zinc-300">{item.features.map((feature)=><li key={feature}>✓ {feature}</li>)}</ul>{item.id === "free" ? <Link href="/signin" className="mt-7 rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm font-semibold">Get started</Link> : <button disabled={busy || (plan?.plan_code === item.id && ["active", "trialing"].includes(plan.status))} onClick={() => action("/api/stripe/subscription", { plan: item.id })} className="mt-7 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold disabled:opacity-50">{busy ? "Opening checkout…" : plan?.plan_code === item.id ? "Current plan" : `Subscribe to ${item.name}`}</button>}</article>)}</section>
    <section className="mt-10 grid gap-5 md:grid-cols-3"><article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"><h2 className="text-lg font-semibold">Marketplace sales</h2><p className="mt-3 text-sm leading-6 text-zinc-400">Creators set their own item prices. Card checkout uses Stripe Connect destination charges and the configurable `MARKETPLACE_FEE_PERCENT` application fee. Free listings remain free to publish.</p><Link href="/create" className="mt-4 inline-block text-sm text-purple-300">Publish a listing →</Link></article><article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"><h2 className="text-lg font-semibold">API credits</h2><p className="mt-3 text-sm leading-6 text-zinc-400">Top up with Stripe; the ledger credits one credit per dollar and prompt runs deduct the configured amount.</p><Link href="/credits" className="mt-4 inline-block text-sm text-purple-300">Manage credits →</Link></article><article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"><h2 className="text-lg font-semibold">Tokenization</h2><p className="mt-3 text-sm leading-6 text-zinc-400">Owners can launch listings and claim available creator fees using a connected wallet. Current token pricing and market statistics come from Jupiter's token data APIs.</p><Link href="/tokenization-pricing" className="mt-4 inline-block text-sm text-purple-300">Tokenization details →</Link></article></section>
    <p className="mt-8 text-center text-xs text-zinc-600">Subscription prices and entitlements are set by the Stripe Price objects configured by the project owner.</p>
  </main>;
}
