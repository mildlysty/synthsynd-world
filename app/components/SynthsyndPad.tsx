'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import LaunchTokenButton from './LaunchTokenButton';

type Listing = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  token_address: string | null;
  token_symbol: string | null;
  created_at: string;
};

export default function SynthsyndPad() {
  const [session, setSession] = useState<Session | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      setLoadError('');
      setListings([]);
      if (!nextSession) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.from('agents')
        .select('id,name,description,image_url,token_address,token_symbol,created_at')
        .eq('owner_id', nextSession.user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!active) return;
      if (error) setLoadError('We could not load your listings. Refresh the page and try again.');
      else setListings((data || []) as Listing[]);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => { void load(data.session); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { void load(nextSession); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const eligible = listings.filter((listing) => !listing.token_address);

  return (
    <div className="min-h-screen bg-[#08090d] px-4 py-8 text-zinc-100 sm:px-8 sm:py-12">
      <main className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm text-violet-300 hover:text-violet-200">← Synthsynd World</Link>

        <section className="mt-6 overflow-hidden rounded-3xl border border-violet-900/40 bg-[radial-gradient(ellipse_at_80%_0%,rgba(124,88,219,.2),transparent_38%),linear-gradient(135deg,#10121a,#090a0e_65%)] p-6 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-300">SYNTHSYND WORLD · TOKEN LAUNCHPAD</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">Give your work an on-chain home.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">Prepare a token launch for a listing you created. Set the ticker and launch options, preview the details, then review and sign the transaction in your own wallet.</p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-zinc-700 bg-black/30 px-4 py-2">1. Choose your listing</span>
            <span className="rounded-full border border-zinc-700 bg-black/30 px-4 py-2">2. Set launch details</span>
            <span className="rounded-full border border-zinc-700 bg-black/30 px-4 py-2">3. Review in your wallet</span>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-zinc-500">Your workspace</p>
                <h2 className="mt-2 text-2xl font-bold">Choose a listing</h2>
              </div>
              <Link href="/create?type=agent" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold hover:border-violet-400">Publish a listing ↗</Link>
            </div>

            {!session && !loading && <div className="mt-6 rounded-xl border border-zinc-800 bg-black/30 p-5"><p className="text-zinc-300">Sign in to see your listings and prepare a launch.</p><Link href="/signin?next=%2Fsynthsyndpad" className="mt-4 inline-flex rounded-lg bg-violet-600 px-4 py-3 font-semibold hover:bg-violet-500">Sign in with Google or X</Link></div>}
            {loading && <p className="mt-6 text-sm text-zinc-400" role="status">Loading your listings…</p>}
            {loadError && <p className="mt-6 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200" role="alert">{loadError}</p>}

            {session && !loading && !loadError && listings.length === 0 && <div className="mt-6 rounded-xl border border-dashed border-zinc-700 p-6"><h3 className="font-semibold">Publish your first listing</h3><p className="mt-2 text-sm leading-6 text-zinc-400">SynthsyndPad launches a token linked to a listing in your account. Create the listing first, then return here to continue.</p><Link href="/create?type=agent" className="mt-4 inline-flex rounded-lg bg-violet-600 px-4 py-3 font-semibold hover:bg-violet-500">Create an agent listing</Link></div>}

            {session && !loading && !loadError && listings.length > 0 && <div className="mt-6 space-y-3">
              {listings.map((listing) => {
                const isSelected = selectedId === listing.id;
                return <article key={listing.id} className={'overflow-hidden rounded-2xl border ' + (isSelected ? 'border-violet-500/70 bg-violet-950/10' : 'border-zinc-800 bg-black/25')}>
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                    {listing.image_url ? <img src={listing.image_url} alt="" className="h-16 w-16 rounded-xl border border-zinc-800 object-cover" /> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-violet-900/60 bg-violet-950/40 text-xl font-bold text-violet-200">{listing.name.slice(0, 1).toUpperCase()}</div>}
                    <div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{listing.name}</h3><p className="mt-1 line-clamp-2 text-sm text-zinc-400">{listing.description || 'No description added.'}</p></div>
                    {listing.token_address ? <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-emerald-900 bg-emerald-950/30 px-3 py-1 text-xs font-semibold text-emerald-300">TOKEN LINKED · {listing.token_symbol || 'LIVE'}</span><a href={'https://solscan.io/token/' + encodeURIComponent(listing.token_address)} target="_blank" rel="noreferrer" className="text-sm text-cyan-200 underline underline-offset-4">View mint ↗</a></div> : <button type="button" onClick={() => setSelectedId(isSelected ? null : listing.id)} aria-expanded={isSelected} className="min-h-11 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500">{isSelected ? 'Close setup' : 'Prepare launch'}</button>}
                  </div>
                  {isSelected && !listing.token_address && <div className="border-t border-zinc-800 p-4 sm:p-5"><LaunchTokenButton listingId={listing.id} name={listing.name} description={listing.description || ''} ownerId={session.user.id} /></div>}
                </article>;
              })}
              {eligible.length === 0 && <p className="text-sm text-zinc-400">All your listings already have a token linked.</p>}
            </div>}
          </div>

          <aside className="h-fit rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">Before you launch</p>
            <ul className="mt-4 space-y-4 text-sm leading-6 text-zinc-300">
              <li><b className="text-white">Provider:</b> this flow uses Jupiter Studio (beta), not Raydium LaunchLab or Pump.fun.</li>
              <li><b className="text-white">Your wallet:</b> it signs the transaction; Synthsynd never receives your seed phrase or private key.</li>
              <li><b className="text-white">Review:</b> inspect the transaction and any network or provider fees in your wallet before signing.</li>
              <li><b className="text-white">Market risk:</b> token launches can fail and tokens can lose all value. No price, liquidity, buyers, or returns are promised.</li>
            </ul>
            <p className="mt-5 border-t border-zinc-800 pt-4 text-xs leading-5 text-zinc-500">A successful request depends on Jupiter Studio availability, correct server configuration, and wallet approval. A launch is final once submitted on-chain.</p>
          </aside>
        </section>
      </main>
    </div>
  );
}

