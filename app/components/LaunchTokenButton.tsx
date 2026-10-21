'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { VersionedTransaction } from '@solana/web3.js';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';

type Props = { listingId: string; name: string; description: string; ownerId: string; };
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function readJson(response: Response) {
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof result?.error === 'string' ? result.error : 'Token launch request failed.');
  return result;
}

export default function LaunchTokenButton({ listingId, name, description, ownerId }: Props) {
  const { publicKey, signTransaction } = useWallet();
  const router = useRouter();
  const [symbol, setSymbol] = useState('');
  const [feeSelection, setFeeSelection] = useState<'market' | 'frenzy'>('market');
  const [holderGated, setHolderGated] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [checkedOwner, setCheckedOwner] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) { setIsOwner(data.user?.id === ownerId); setCheckedOwner(true); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) { setIsOwner(session?.user.id === ownerId); setCheckedOwner(true); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [ownerId]);

  async function launch(event: React.FormEvent) {
    event.preventDefault();
    setError(''); setMessage('');
    if (!publicKey || !signTransaction) return setError('Connect a wallet that supports transaction signing.');
    if (!image || !imageTypes.has(image.type) || image.size > 5_000_000) return setError('Choose a JPEG, PNG, GIF, or WebP image up to 5 MB.');
    const ticker = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,10}$/.test(ticker)) return setError('Ticker must be 2–10 letters or numbers.');

    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in before launching a token.');
      const authorization = { Authorization: `Bearer ${session.access_token}` };
      const txInfo = await readJson(await fetch('/api/solana/launch/create-tx', {
        method: 'POST', headers: { ...authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, ownerWallet: publicKey.toBase58(), tokenSymbol: ticker, feeSelection, vaultMode: holderGated, imageContentType: image.type }),
      }));

      const imageUpload = await fetch(txInfo.imagePresignedUrl, { method: 'PUT', headers: { 'Content-Type': image.type }, body: image });
      if (!imageUpload.ok) throw new Error('Could not upload the token image to Jupiter.');
      const metadata = { name: name.slice(0, 32), symbol: ticker, description: holderGated ? 'Token holder access is enabled. Visit Synthsynd World to verify access.' : description, image: txInfo.imageUrl, website: '', twitter: '', telegram: '' };
      const metadataUpload = await fetch(txInfo.metadataPresignedUrl, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metadata) });
      if (!metadataUpload.ok) throw new Error('Could not upload token metadata to Jupiter.');

      const unsigned = VersionedTransaction.deserialize(Uint8Array.from(atob(txInfo.transaction), c => c.charCodeAt(0)));
      const signed = await signTransaction(unsigned);
      const form = new FormData();
      form.set('listingId', listingId); form.set('ownerWallet', publicKey.toBase58());
      form.set('signedTransaction', bytesToBase64(signed.serialize()));
      form.set('tokenSymbol', ticker); form.set('feeSelection', feeSelection); form.set('headerImage', image, image.name);
      form.set('vaultMode', String(holderGated));
      const result = await readJson(await fetch('/api/solana/launch/submit', { method: 'POST', headers: authorization, body: form }));
      setMessage(`Token launched: ${result.mint}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Token launch failed.');
    } finally { setBusy(false); }
  }

  if (!checkedOwner || !isOwner) return null;
  return <section className="mt-8 rounded-2xl border border-purple-900/60 bg-purple-950/20 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-zinc-100">Launch this listing as a token</h2><p className="mt-1 text-sm text-zinc-400">Your connected wallet reviews and signs the Solana transaction. The app never receives your private key.</p></div><WalletMultiButton className="!h-10 !rounded-lg !bg-purple-600 !text-sm" /></div>
    <form onSubmit={launch} className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-zinc-300">Token ticker<input required minLength={2} maxLength={10} pattern="[A-Za-z0-9]{2,10}" value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="SWARM" className="mt-2 w-full rounded-lg border border-zinc-700 bg-black p-3 uppercase" /></label>
      <label className="text-sm text-zinc-300">Launch mode<select value={feeSelection} onChange={e => setFeeSelection(e.target.value as 'market' | 'frenzy')} className="mt-2 w-full rounded-lg border border-zinc-700 bg-black p-3"><option value="market">Standard</option><option value="frenzy">Frenzy</option></select></label>
      <label className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-black/40 p-4 text-sm text-zinc-300 sm:col-span-2"><input type="checkbox" checked={holderGated} onChange={event => setHolderGated(event.target.checked)} className="mt-1 accent-amber-500" /><span><b className="block text-zinc-100">Require token-holder access</b><span className="mt-1 block text-xs leading-5 text-zinc-500">Only wallets holding this token can reveal the listing description and source. The on-chain token metadata will use a generic description so your private listing description is not published there. Visitors sign a message; no payment transaction is sent.</span></span></label>
      <label className="text-sm text-zinc-300 sm:col-span-2">Token image<input required type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={e => setImage(e.target.files?.[0] || null)} className="mt-2 block w-full rounded-lg border border-zinc-700 bg-black p-3 text-sm" /></label>
      {error && <p role="alert" className="sm:col-span-2 rounded-lg border border-rose-900 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
      {message && <p className="sm:col-span-2 break-all rounded-lg border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-200">{message}</p>}
      <button disabled={busy || !publicKey} className="rounded-xl bg-purple-600 px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2">{busy ? 'Preparing wallet transaction…' : 'Create and sign launch transaction'}</button>
    </form>
  </section>;
}
