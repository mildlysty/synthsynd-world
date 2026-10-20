"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "../../../utils/supabase";

function CheckoutSuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") || "";
  const [state, setState] = useState("Checking payment status…");
  const [listingId, setListingId] = useState("");
  const [bundleId, setBundleId] = useState("");
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Sign in with the account used for checkout to view your purchase.");
      const response = await fetch(`/api/stripe/purchases/${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${data.session.access_token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not verify purchase.");
      if (!active) return;
      setListingId(result.purchase.listing_id);
      setBundleId(result.purchase.bundle_id || "");
      setState(result.purchase.status === "paid" ? "Payment confirmed. Your listing access is ready." : "Payment is processing. Refresh this page in a moment; access opens after Stripe confirms payment.");
    })().catch((error: unknown) => { if (active) setState(error instanceof Error ? error.message : "Could not verify payment."); });
    return () => { active = false; };
  }, [sessionId]);
  return <main className="mx-auto max-w-2xl px-5 py-20 text-center text-zinc-100"><div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10"><p className="text-4xl">✓</p><h1 className="mt-4 text-3xl font-bold">Checkout return</h1><p className="mt-4 leading-7 text-zinc-400">{state}</p><div className="mt-7 flex justify-center gap-3"><button onClick={() => window.location.reload()} className="rounded-xl border border-zinc-700 px-4 py-2">Refresh status</button>{listingId && <Link href={`/agent/${listingId}`} className="rounded-xl bg-purple-600 px-4 py-2 font-semibold">Open listing</Link>}{bundleId && <Link href={`/bundle/${bundleId}`} className="rounded-xl bg-purple-600 px-4 py-2 font-semibold">Open bundle</Link>}</div></div></main>;
}

export default function CheckoutSuccessPage() {
  return <Suspense fallback={<main className="p-10 text-zinc-400">Checking payment…</main>}><CheckoutSuccessContent /></Suspense>;
}
