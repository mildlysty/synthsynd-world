"use client";

import { useState } from "react";
import { supabase } from "../../utils/supabase";

export default function BuyButton({ listingId, price, isFree }: { listingId?: string; bundleId?: string; price?: number | null; isFree: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function runLocalCheckout() {
    setBusy(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Sign in first to test paid listing access.");
      if (!listingId) throw new Error("Local checkout is available for individual listings only.");
      const response = await fetch("/api/dev/mock-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ listingId }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "Could not complete the local access test.");
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not complete the local access test.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {isFree ? <a href="#listing-content" className="block w-full rounded-xl border border-emerald-800 bg-emerald-950/30 py-3 text-center font-semibold text-emerald-300 hover:bg-emerald-950/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">View free content ↓</a> : <div className="space-y-3 rounded-xl border border-amber-800 bg-amber-950/20 p-4 text-sm leading-6 text-amber-100"><p>Paid checkout is not enabled yet. No payment will be taken.</p>{process.env.NEXT_PUBLIC_LOCAL_MOCK_CHECKOUT_ENABLED === "true" && listingId && typeof price === "number" && price > 0 && <><button type="button" onClick={runLocalCheckout} disabled={busy} className="w-full rounded-lg border border-amber-500/60 bg-amber-900/30 px-4 py-2.5 font-semibold text-amber-100 hover:bg-amber-900/60 disabled:opacity-60">{busy ? "Testing access…" : "Test content access (local only)"}</button><p className="text-xs text-amber-200/80">TEST ONLY · No money moves and no purchase is recorded. This works only on the local development site.</p></>}{error && <p role="alert" className="text-sm text-rose-300">{error}</p>}</div>}
    </>
  );
}
