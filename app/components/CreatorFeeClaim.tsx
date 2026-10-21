'use client';

import { useCallback, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { VersionedTransaction } from '@solana/web3.js';
import { supabase } from '../../utils/supabase';

type Props = { listingId: string; creatorId: string; creatorWallet: string; onClaimed?: () => void | Promise<void>; };
type FeeState = { unclaimed: string; total: string; poolAddress: string; quoteDecimals: number };

function usdc(raw: string, decimals: number) {
  const value = Number(raw) / 10 ** decimals;
  return Number.isFinite(value) ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : '—';
}

export default function CreatorFeeClaim({ listingId, creatorId, creatorWallet, onClaimed }: Props) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);
  const [fees, setFees] = useState<FeeState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signature, setSignature] = useState('');

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) { setAllowed(data.user?.id === creatorId); setReady(true); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) { setAllowed(session?.user.id === creatorId); setReady(true); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [creatorId]);

  const refreshFees = useCallback(async () => {
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sign in to load creator fees.');
    const response = await fetch(`/api/solana/fees?listingId=${encodeURIComponent(listingId)}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error || 'Could not load creator fees.');
    setFees(body);
  }, [listingId]);

  useEffect(() => {
    if (ready && allowed) refreshFees().catch(cause => setError(cause instanceof Error ? cause.message : 'Could not load creator fees.'));
  }, [ready, allowed, refreshFees]);

  async function claimFees() {
    setBusy(true); setError(''); setSignature('');
    try {
      if (!publicKey || !signTransaction) throw new Error('Connect the token creator wallet and enable transaction signing.');
      if (publicKey.toBase58() !== creatorWallet) throw new Error('Connect the wallet that created this token.');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in to claim creator fees.');
      const response = await fetch('/api/solana/fees', {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, ownerWallet: publicKey.toBase58() }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || typeof body?.transaction !== 'string') throw new Error(body?.error || 'Could not prepare a fee claim.');
      const tx = VersionedTransaction.deserialize(Uint8Array.from(atob(body.transaction), c => c.charCodeAt(0)));
      const signed = await signTransaction(tx);
      const txid = await connection.sendRawTransaction(signed.serialize(), { maxRetries: 3, preflightCommitment: 'confirmed' });
      setSignature(txid);
      const confirmed = await connection.confirmTransaction(txid, 'confirmed');
      if (confirmed.value.err) throw new Error(`Claim transaction failed: ${JSON.stringify(confirmed.value.err)}`);
      await refreshFees();
      await onClaimed?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Creator fee claim failed.');
    } finally { setBusy(false); }
  }

  if (!ready || !allowed) return null;
  return <section className="mt-5 rounded-2xl border border-emerald-900/60 bg-emerald-950/10 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-zinc-100">Creator trading fees</h3><p className="mt-1 text-sm text-zinc-400">Fees are read from Jupiter Studio; claiming requires the original creator wallet and an on-chain signature.</p></div><button type="button" onClick={() => refreshFees().catch(e => setError(e.message))} disabled={busy} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 disabled:opacity-50">Refresh</button></div>
    {fees && <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-zinc-800 bg-black/40 p-4"><p className="text-xs uppercase tracking-wide text-zinc-500">Unclaimed</p><p className="mt-2 text-2xl font-semibold">${usdc(fees.unclaimed, fees.quoteDecimals)} USDC</p></div><div className="rounded-xl border border-zinc-800 bg-black/40 p-4"><p className="text-xs uppercase tracking-wide text-zinc-500">Total creator share</p><p className="mt-2 text-2xl font-semibold">${usdc(fees.total, fees.quoteDecimals)} USDC</p></div></div>}
    {error && <p role="alert" className="mt-4 rounded-lg border border-rose-900 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
    {signature && <p className="mt-4 break-all text-xs text-emerald-300">Transaction: <a className="underline" href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">{signature}</a></p>}
    <button type="button" onClick={claimFees} disabled={busy || !publicKey || publicKey.toBase58() !== creatorWallet} className="mt-4 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Confirming claim…' : 'Claim available fees'}</button>
    {publicKey && publicKey.toBase58() !== creatorWallet && <p className="mt-2 text-xs text-amber-300">Connect {creatorWallet} to claim these fees.</p>}
  </section>;
}
