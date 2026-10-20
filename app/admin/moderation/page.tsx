"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../../utils/supabase";

type Status = "pending" | "published" | "rejected" | "suspended";
type Listing = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  user_id: string | null;
  owner_id: string | null;
  statusType: string | null;
  created_at: string;
  publication_status: Status;
  token_address: string | null;
  x402_url: string | null;
  mcp_server_url: string | null;
};

const filters = ["pending", "published", "suspended", "rejected", "all"] as const;

export default function ModerationPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState<(typeof filters)[number]>("pending");
  const [listings, setListings] = useState<Listing[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (token: string, nextStatus: string, nextPage: number) => {
    const response = await fetch(`/api/admin/listings?status=${encodeURIComponent(nextStatus)}&page=${nextPage}&limit=20`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Could not load moderation listings.");
    setListings(body.listings ?? []);
    setTotal(body.total ?? 0);
  }, []);

  useEffect(() => {
    let active = true;
    async function initialize() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      if (!data.session) { setLoading(false); return; }
      try {
        const response = await fetch("/api/admin/access", { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: "no-store" });
        const access = await response.json();
        if (!active) return;
        setIsAdmin(Boolean(access.isAdmin));
        if (!response.ok || !access.isAdmin) {
          setError(access.error || "This account is not on the server's admin allowlist.");
          return;
        }
        await load(data.session.access_token, status, page);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load the moderation queue.");
      } finally { if (active) setLoading(false); }
    }
    initialize();
    return () => { active = false; };
  }, [load, page, status]);

  async function changeStatus(listing: Listing, next: Status) {
    if (!session) return;
    setBusyId(listing.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/listings", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, status: next, reason: reasons[listing.id] ?? "" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not save moderation decision.");
      setNotice(`${listing.name} moved to ${next}.`);
      await load(session.access_token, status, page);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save moderation decision.");
    } finally { setBusyId(""); }
  }

  return <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8"><div className="mx-auto max-w-6xl">
    <header className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-zinc-950 to-zinc-950 p-8 sm:p-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">Marketplace operations</p>
      <h1 className="mt-2 text-4xl font-bold">Listing moderation</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Review, publish, reject, or suspend marketplace listings. Each decision is saved to the moderation audit log.</p>
    </header>

    {error && <p role="alert" className="mt-5 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
    {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-200">{notice}</p>}
    {loading ? <p className="mt-8 text-zinc-500">Loading moderation access…</p> : !session ? (
      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">Sign in with an admin account to continue. <Link href="/signin?next=/admin/moderation" className="ml-2 text-purple-300 underline">Sign in</Link></div>
    ) : !isAdmin ? (
      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">Admin access is restricted to account IDs configured in <code>ADMIN_USER_IDS</code>.</div>
    ) : <>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">{filters.map((item) => <button key={item} onClick={() => { setStatus(item); setPage(1); }} aria-pressed={status === item} className={`rounded-full border px-4 py-2 text-sm capitalize ${status === item ? "border-amber-400 bg-amber-400/10 text-amber-200" : "border-zinc-800 text-zinc-400 hover:text-white"}`}>{item}</button>)}</div>
        <p className="text-sm text-zinc-500">{total.toLocaleString()} listings</p>
      </div>

      <div className="mt-5 space-y-4">
        {listings.map((listing) => <article key={listing.id} className="grid gap-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 md:grid-cols-[160px_1fr]">
          {listing.image_url ? <img src={listing.image_url} alt="" className="h-36 w-full rounded-xl object-cover md:w-40" /> : <div className="flex h-36 items-center justify-center rounded-xl bg-zinc-900 text-3xl text-zinc-600 md:w-40">{listing.name.slice(0, 1).toUpperCase()}</div>}
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-cyan-300">{listing.statusType || "listing"} · <span className="text-amber-300">{listing.publication_status}</span></p><h2 className="mt-1 text-xl font-semibold">{listing.name}</h2></div><time className="text-xs text-zinc-600">{new Date(listing.created_at).toLocaleString()}</time></div>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">{listing.description || "No description provided."}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500"><span>Creator: {listing.owner_id || listing.user_id || "unknown"}</span>{listing.token_address && <span>Tokenized</span>}{listing.x402_url && <span>x402 service</span>}{listing.mcp_server_url && <span>MCP server</span>}</div>
            <textarea aria-label={`Moderation note for ${listing.name}`} value={reasons[listing.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [listing.id]: event.target.value }))} maxLength={1000} rows={2} placeholder="Optional moderation reason" className="mt-4 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm outline-none focus:border-amber-500" />
            <div className="mt-3 flex flex-wrap gap-2">
              {(["published", "rejected", "suspended", "pending"] as Status[]).filter((action) => action !== listing.publication_status).map((action) => <button key={action} disabled={busyId === listing.id} onClick={() => changeStatus(listing, action)} className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize disabled:opacity-50 ${action === "published" ? "border-emerald-800 text-emerald-200" : action === "rejected" ? "border-rose-900 text-rose-200" : "border-zinc-700 text-zinc-300"}`}>{busyId === listing.id ? "Saving…" : action === "pending" ? "Return to queue" : action}</button>)}
            </div>
          </div>
        </article>)}
        {!listings.length && <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">No listings in this moderation view.</div>}
      </div>
      <div className="mt-6 flex items-center justify-between"><button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm disabled:opacity-40">Previous</button><span className="text-sm text-zinc-500">Page {page} of {Math.max(1, Math.ceil(total / 20))}</span><button disabled={page * 20 >= total} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm disabled:opacity-40">Next</button></div>
    </>}
  </div></main>;
}
