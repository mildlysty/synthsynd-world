"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "../../utils/supabase";

export default function ListingContent({ id, type, isFree, holderGated = false, tokenAddress = "" }: { id: string; type: string; isFree: boolean; holderGated?: boolean; tokenAddress?: string }) {
  const { publicKey, signMessage } = useWallet();
  const [content, setContent] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [hasAccess, setHasAccess] = useState(!holderGated);
  const [checking, setChecking] = useState(false);

  async function requestContent() {
    setChecking(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const headers: Record<string, string> = data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
      if (holderGated) {
        if (publicKey && signMessage) {
          const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, "0")).join("");
          const message = `synthsynd-holder-access:${id}:${tokenAddress}:${Date.now()}:${nonce}`;
          const signature = await signMessage(new TextEncoder().encode(message));
          headers["x-holder-wallet"] = publicKey.toBase58();
          headers["x-holder-message"] = message;
          headers["x-holder-signature"] = btoa(String.fromCharCode(...signature));
        }
      }
      const response = await fetch(`/api/v1/items/${encodeURIComponent(id)}`, { headers, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || (result.gated ? "This wallet does not hold the access token." : "Could not load listing content."));
      setContent(typeof result.item?.content === "string" ? result.item.content : null);
      setDescription(typeof result.item?.description === "string" ? result.item.description : null);
      setHasAccess(true);
      setLoaded(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load listing content.");
      setLoaded(true);
    } finally { setChecking(false); }
  }

  useEffect(() => {
    if (!holderGated) void requestContent();
    // The request is intentionally user-triggered for gated listings so the wallet can sign.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, holderGated]);
  if (!loaded) return <p id="listing-content" className="mt-8 scroll-mt-6 text-sm text-zinc-500">Loading listing content…</p>;
  if (holderGated && !hasAccess) return <section id="listing-content" className="mt-8 scroll-mt-6 rounded-xl border border-amber-900 bg-amber-950/20 p-4"><h2 className="font-semibold text-amber-200">Token holder access</h2><p className="mt-2 text-sm text-zinc-400">Sign in as the listing owner or sign a short message with a wallet holding this listing’s token. No transaction is sent.</p>{error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}<button type="button" onClick={requestContent} disabled={checking} className="mt-4 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">{checking ? "Checking access…" : "Verify access"}</button></section>;
  if (!content && error) return <section id="listing-content" className="mt-8 scroll-mt-6 rounded-xl border border-amber-900/70 bg-amber-950/20 p-4"><h2 className="font-semibold text-amber-200">Couldn’t load this listing</h2><p className="mt-2 text-sm leading-6 text-zinc-300">There was a problem retrieving the listing content. Try again in a moment.</p><p role="alert" className="mt-3 text-sm text-rose-300">{error}</p><button type="button" onClick={requestContent} disabled={checking} className="mt-4 rounded-lg border border-amber-700 px-4 py-2.5 text-sm font-semibold text-amber-100 disabled:opacity-50">{checking ? "Retrying…" : "Try again"}</button></section>;
  if (!content && !isFree) return <p id="listing-content" className="mt-8 scroll-mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">Purchase this listing to access its source or prompt. If you have already purchased it, refresh after checkout.</p>;
  if (!content) return <section id="listing-content" className="mt-8 scroll-mt-6 rounded-xl border border-amber-900/70 bg-amber-950/20 p-4"><h2 className="font-semibold text-amber-200">This free listing isn’t ready to use yet</h2><p className="mt-2 text-sm leading-6 text-zinc-300">It’s marked as free, but the creator hasn’t attached the prompt or source content. Browse other listings while this one is completed.</p><Link href="/marketplace" className="mt-4 inline-flex rounded-lg border border-amber-700 px-4 py-2.5 text-sm font-semibold text-amber-100 hover:bg-amber-950/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">Explore marketplace <span aria-hidden="true" className="ml-2">→</span></Link></section>;
  return <>{holderGated && description && <section className="mt-8 rounded-2xl border border-amber-900/60 bg-amber-950/10 p-5"><h2 className="font-semibold text-amber-100">Token holder details</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{description}</p></section>}<section id="listing-content" className="mt-8 scroll-mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{type === "prompt" ? "Prompt" : type === "skill" ? "Skill content" : "Source"}</h2>{type === "prompt" && <Link href={`/prompt/${id}/chat`} className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold">Run prompt</Link>}</div><pre className="max-h-[600px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black p-4 font-mono text-xs leading-6 text-zinc-300">{content}</pre></section></>;
}
