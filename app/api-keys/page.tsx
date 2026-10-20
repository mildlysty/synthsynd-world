"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../utils/supabase";

type ApiKey = {
  id: string;
  label: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};
type PlanCode = "free" | "pro" | "premium";

export default function ApiKeysPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [label, setLabel] = useState("My application");
  const [newSecret, setNewSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [planInfo, setPlanInfo] = useState<{ plan: PlanCode; limits: { perMinute: number; perMonth: number } } | null>(null);

  const loadKeys = useCallback(async (accessToken: string) => {
    const response = await fetch("/api/v1/keys", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Could not load API keys.");
    setKeys(body.keys ?? []);
    if (body.plan && body.limits) setPlanInfo({ plan: body.plan, limits: body.limits });
  }, []);

  useEffect(() => {
    let mounted = true;
    async function initialize() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        try { await loadKeys(data.session.access_token); }
        catch (reason) { if (mounted) setError(reason instanceof Error ? reason.message : "Could not load API keys."); }
      }
      if (mounted) setLoading(false);
    }
    initialize();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setNewSecret("");
      if (!nextSession) setKeys([]);
      else loadKeys(nextSession.access_token).catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Could not load API keys.");
      });
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [loadKeys]);

  async function createKey(event: React.FormEvent) {
    event.preventDefault();
    if (!session) return;
    setBusy(true); setError(""); setNotice(""); setNewSecret("");
    try {
      const response = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not create API key.");
      setNewSecret(body.secret);
      setKeys((current) => [body.key, ...current]);
      setNotice("Copy this key now. The full secret is only shown once.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create API key.");
    } finally { setBusy(false); }
  }

  async function revokeKey(id: string) {
    if (!session || !window.confirm("Revoke this API key? Requests using it will stop working.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/v1/keys", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not revoke API key.");
      setKeys((current) => current.map((key) => key.id === id ? { ...key, revoked_at: new Date().toISOString() } : key));
      setNotice("API key revoked.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not revoke API key.");
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium text-cyan-300">Developer settings</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">API keys</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">Create keys for your integrations. Keys are stored as hashes and the secret is displayed only once.</p>

        {error && <p role="alert" className="mt-6 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
        {notice && <p role="status" className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-200">{notice}</p>}

        {newSecret && <div className="mt-4 rounded-xl border border-amber-800 bg-amber-950/30 p-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-amber-200">Copy your new key</label>
          <div className="mt-2 flex flex-wrap gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg bg-black p-3 text-sm text-amber-100">{newSecret}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(newSecret).then(() => setNotice("Key copied to clipboard."))} className="rounded-lg bg-amber-200 px-4 py-2 text-sm font-bold text-black">Copy</button>
          </div>
        </div>}

        {loading ? <p className="mt-8 text-zinc-500">Loading account…</p> : !session ? (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <p>Sign in to create and manage API keys.</p>
            <Link href="/signin" className="mt-4 inline-flex rounded-lg bg-purple-600 px-4 py-2 font-semibold">Sign in</Link>
          </div>
        ) : <>
          {planInfo && <section className="mt-8 rounded-2xl border border-cyan-900/70 bg-cyan-950/20 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">{planInfo.plan} API limits</p><p className="mt-2 text-sm text-zinc-300">Each key allows {planInfo.limits.perMinute.toLocaleString()} requests per minute · {planInfo.limits.perMonth.toLocaleString()} requests per month</p><Link href="/pricing" className="mt-2 inline-block text-xs text-cyan-300 underline">View plans</Link></section>}
          <form onSubmit={createKey} className="mt-8 flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:flex-row">
            <input aria-label="API key name" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} required className="min-h-11 flex-1 rounded-lg border border-zinc-700 bg-black px-3" placeholder="Key name" />
            <button disabled={busy} className="rounded-lg bg-purple-600 px-5 py-3 font-semibold disabled:opacity-60">{busy ? "Working…" : "Create key"}</button>
          </form>
          <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-800">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-zinc-900 px-5 py-3 text-xs uppercase tracking-wide text-zinc-500"><span>Name / key</span><span>Created</span><span>Action</span></div>
            {keys.length === 0 ? <p className="p-6 text-zinc-500">No API keys yet.</p> : keys.map((key) => (
              <div key={key.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-zinc-800 px-5 py-4 text-sm">
                <div><p className="font-medium">{key.label}</p><code className="text-xs text-zinc-500">{key.key_prefix}••••••••</code>{key.revoked_at && <p className="mt-1 text-xs text-rose-300">Revoked</p>}</div>
                <time className="text-xs text-zinc-500">{new Date(key.created_at).toLocaleDateString()}</time>
                {key.revoked_at ? <span className="text-xs text-zinc-600">Inactive</span> : <button disabled={busy} onClick={() => revokeKey(key.id)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs hover:border-rose-700 hover:text-rose-300 disabled:opacity-50">Revoke</button>}
              </div>
            ))}
          </section>
        </>}
      </div>
    </main>
  );
}
