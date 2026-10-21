"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "../../utils/supabase";
import FeeDashboard from "./FeeDashboard";

export default function PayoutsPage() {
  const [country, setCountry] = useState("US");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function connect() {
    setBusy(true); setError("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Sign in before setting up payouts.");
      const response = await fetch("/api/stripe/connect", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ country }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not start Stripe onboarding.");
      window.location.assign(result.url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start onboarding."); setBusy(false); }
  }
  return <main className="mx-auto max-w-3xl px-5 py-12 text-zinc-100">
    <Link href="/settings" className="text-sm text-purple-300">← Account settings</Link>
    <h1 className="mt-5 text-4xl font-bold">Creator payouts</h1>
    <p className="mt-3 max-w-2xl leading-7 text-zinc-400">Track on-chain creator fees from your tokenized listings and sign claim transactions with the wallet that launched each token. x402 service payments are paid directly to each service’s configured recipient.</p>
    <FeeDashboard />
    <section className="mt-12 border-t border-zinc-800 pt-8">
    <h2 className="text-2xl font-semibold">Marketplace sales payouts</h2>
    <p className="mt-3 max-w-2xl leading-7 text-zinc-400">Connect a Stripe Express account to receive marketplace sales. Stripe handles identity verification and payout details. Checkout remains unavailable to buyers until Stripe enables charges for your account.</p>
    <div className="mt-8 space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <label className="block text-sm text-zinc-300">Country code
        <input value={country} onChange={(event) => setCountry(event.target.value.toUpperCase().slice(0, 2))} maxLength={2} placeholder="US" className="mt-2 block w-28 rounded-lg border border-zinc-700 bg-black px-3 py-2 uppercase" />
      </label>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <button onClick={connect} disabled={busy || country.length !== 2} className="rounded-xl bg-purple-600 px-5 py-3 font-semibold disabled:opacity-50">{busy ? "Opening Stripe…" : "Continue to Stripe"}</button>
    </div>
    <p className="mt-5 text-xs text-zinc-500">Payments require platform approval, a configured Stripe webhook, and valid secret keys. Set the webhook to <code>/api/stripe/webhook</code> and subscribe to <code>checkout.session.completed</code>, <code>checkout.session.expired</code>, and <code>account.updated</code>.</p>
    </section>
  </main>;
}
