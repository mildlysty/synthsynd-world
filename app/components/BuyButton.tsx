'use client';
import { useState } from 'react';
import { supabase } from '../../utils/supabase';

export default function BuyButton({ listingId, bundleId, price, isFree }: { listingId?: string; bundleId?: string; price: number; isFree: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function checkout() {
    setBusy(true); setError('');
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { window.location.assign('/signin'); return; }
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify(listingId ? { listingId } : { bundleId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not start checkout.');
      window.location.assign(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start checkout.');
      setBusy(false);
    }
  }
  return (
    <>
      {isFree ? <a href="#listing-content" className="block w-full rounded-xl border border-emerald-800 bg-emerald-950/30 py-3 text-center font-semibold text-emerald-300 hover:bg-emerald-950/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">Check free content ↓</a> : <button onClick={checkout} disabled={busy} className="w-full rounded-xl bg-purple-600 py-3 font-bold disabled:opacity-50">{busy ? 'Opening checkout…' : `Buy for $${Number(price || 0).toFixed(2)}`}</button>}
      {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
    </>
  );
}
