"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "../../../../utils/supabase";

type Listing = { id: string; name: string; description: string; is_free: boolean; statusType: string; content?: string; gated?: boolean; vault_mode?: boolean; token_address?: string };
type Message = { role: "user" | "assistant"; content: string };

export default function PromptChatPage() {
  const { id } = useParams<{ id: string }>();
  const { publicKey, signMessage } = useWallet();
  const [listing, setListing] = useState<Listing | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function holderHeaders() {
    if (!listing?.vault_mode || !listing.token_address) return {} as Record<string, string>;
    if (!publicKey || !signMessage) return {} as Record<string, string>;
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, "0")).join("");
    const message = `synthsynd-holder-access:${id}:${listing.token_address}:${Date.now()}:${nonce}`;
    const signature = await signMessage(new TextEncoder().encode(message));
    return { "x-holder-wallet": publicKey.toBase58(), "x-holder-message": message, "x-holder-signature": btoa(String.fromCharCode(...signature)) } as Record<string, string>;
  }

  async function verifyHolder() {
    setError("");
    try {
      const headers = await holderHeaders();
      const response = await fetch(`/api/v1/items/${encodeURIComponent(id)}`, { headers, cache: "no-store" });
      const payload = await response.json();
      if (payload.item) setListing(payload.item);
      if (!response.ok) throw new Error(payload.error || "This wallet does not hold the access token.");
      setListing(payload.item);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not verify wallet access."); }
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/items/${encodeURIComponent(id)}`).then(async (response) => {
      const payload = await response.json();
      if (payload.item) setListing(payload.item);
      if (!response.ok) throw new Error(payload.error || "Could not load prompt.");
      if (active) setListing(payload.item);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Could not load prompt.");
    });
    return () => { active = false; };
  }, [id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setError("");
    setInput("");
    setMessages((current) => [...current, { role: "user", content: text }]);
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Sign in to run prompts.");
      const walletHeaders = await holderHeaders();
      const response = await fetch("/api/prompt-run", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}`, ...walletHeaders },
        body: JSON.stringify({ listingId: id, message: text }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Prompt run failed.");
      setMessages((current) => [...current, { role: "assistant", content: result.answer }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Prompt run failed.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="mx-auto max-w-4xl px-5 py-10 text-zinc-100">
    <Link href={`/prompt/${id}`} className="text-sm text-purple-300 hover:text-purple-200">← Back to prompt</Link>
    <h1 className="mt-5 text-3xl font-bold">{listing?.name || "Run prompt"}</h1>
    <p className="mt-2 text-sm text-zinc-400">{listing?.description || "Chat with this marketplace prompt."}</p>
    {listing?.vault_mode && <div className="mt-5 rounded-xl border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-100">This prompt is token holder gated. <button type="button" onClick={verifyHolder} className="ml-2 rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-black">Verify token holder</button></div>}
    {listing && !listing.is_free && <div className="mt-6 rounded-xl border border-amber-800 bg-amber-950/40 p-4 text-sm text-amber-200">Paid prompt execution is unavailable until purchase entitlements are configured.</div>}
    {listing?.is_free && !listing.content && <div className="mt-6 rounded-xl border border-zinc-800 p-4 text-sm text-zinc-400">This prompt has no runnable prompt body.</div>}
    <section className="mt-8 min-h-80 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      {messages.length === 0 && <p className="text-sm text-zinc-500">Your conversation will appear here.</p>}
      {messages.map((message, index) => <article key={`${index}-${message.role}`} className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-purple-700 text-white" : "bg-zinc-900 text-zinc-200"}`}><p className="mb-1 text-xs uppercase tracking-wide opacity-60">{message.role}</p>{message.content}</article>)}
      {busy && <p className="text-sm text-zinc-500">Running prompt…</p>}
    </section>
    {error && <p role="alert" className="mt-4 rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200">{error} {error.includes("Sign in") && <Link className="underline" href="/signin">Sign in</Link>}</p>}
    <form onSubmit={submit} className="mt-4 flex gap-3">
      <textarea aria-label="Message" value={input} onChange={(event) => setInput(event.target.value)} maxLength={8000} rows={3} placeholder="Message this prompt…" disabled={busy || !listing?.is_free || !listing?.content} className="min-w-0 flex-1 resize-y rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm outline-none focus:border-purple-500 disabled:opacity-50" />
      <button disabled={busy || !input.trim() || !listing?.is_free || !listing?.content} className="self-end rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Running…" : "Send"}</button>
    </form>
    <p className="mt-2 text-xs text-zinc-600">Runs use API credits (default 0.1 per run) and are limited to 10 per minute. <Link href="/credits" className="underline">View or add credits</Link>.</p>
  </main>;
}
