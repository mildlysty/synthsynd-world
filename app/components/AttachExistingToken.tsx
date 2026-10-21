'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';

type Props = { listingId: string; ownerId: string };

export default function AttachExistingToken({ listingId, ownerId }: Props) {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [mint, setMint] = useState('');
  const [symbol, setSymbol] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function attach(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!publicKey) return setError('Connect the wallet that controls this token.');

    const normalizedMint = mint.trim();
    const normalizedSymbol = symbol.trim().toUpperCase();
    try {
      new PublicKey(normalizedMint);
    } catch {
      return setError('Enter a valid Solana token mint address.');
    }
    if (!/^[A-Z0-9]{2,10}$/.test(normalizedSymbol)) {
      return setError('Ticker must be 2–10 letters or numbers.');
    }

    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== ownerId) throw new Error('Sign in with the account that owns this listing.');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in before attaching a token.');
      const response = await fetch('/api/solana/launch/attach', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          mint: normalizedMint,
          creatorWallet: publicKey.toBase58(),
          tokenSymbol: normalizedSymbol,
          feeSelection: 'market',
          vaultMode: false,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Could not attach this token.');
      setSuccess('Token attached to this listing. Refreshing…');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not attach this token.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-5 rounded-2xl border border-cyan-900/60 bg-cyan-950/10 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="font-semibold text-zinc-100">Attach an existing Solana token</h3>
        <p className="mt-1 text-sm text-zinc-400">Use this for a token already launched on Pump.fun. Connect the wallet that controls it.</p>
      </div>
      <WalletMultiButton className="!h-10 !rounded-lg !bg-purple-600 !text-sm" />
    </div>
    <form onSubmit={attach} className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-zinc-300 sm:col-span-2">Token mint address
        <input required value={mint} onChange={event => setMint(event.target.value)} placeholder="Paste the Solana mint address" className="mt-2 w-full rounded-lg border border-zinc-700 bg-black p-3 font-mono text-sm" />
      </label>
      <label className="text-sm text-zinc-300">Token ticker
        <input required minLength={2} maxLength={10} pattern="[A-Za-z0-9]{2,10}" value={symbol} onChange={event => setSymbol(event.target.value)} placeholder="Ticker, e.g. ABC" className="mt-2 w-full rounded-lg border border-zinc-700 bg-black p-3 uppercase" />
      </label>
      <div className="self-end text-xs leading-5 text-amber-200">This links the mint to your listing; it does not launch a token or move funds. Only attach a mint you control.</div>
      {error && <p role="alert" className="sm:col-span-2 rounded-lg border border-rose-900 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
      {success && <p role="status" className="sm:col-span-2 rounded-lg border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-200">{success}</p>}
      <button type="submit" disabled={busy || !publicKey} className="rounded-xl bg-cyan-700 px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2">{busy ? 'Attaching token…' : 'Attach token to listing'}</button>
    </form>
  </section>;
}
