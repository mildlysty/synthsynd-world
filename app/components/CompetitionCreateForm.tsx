"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../utils/supabase";

export type CreatedCompetition = {
  id: string; slug: string; title: string; description: string; prize_pool_usd: number;
  starts_at: string; ends_at: string; status: "upcoming"; ranking_metric: string;
  winner_display_name: null; winner_prize_usd: null;
};

function localDateTimeOffset(days: number) {
  const value = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
}

export default function CompetitionCreateForm({ onCreated }: { onCreated: (competition: CreatedCompetition) => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prizePool, setPrizePool] = useState("0");
  const [startsAt, setStartsAt] = useState(() => localDateTimeOffset(1));
  const [endsAt, setEndsAt] = useState(() => localDateTimeOffset(8));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      if (!data.session) { setLoading(false); return; }
      try {
        const response = await fetch("/api/admin/access", { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: "no-store" });
        const body = await response.json();
        if (active) setIsAdmin(Boolean(response.ok && body.isAdmin));
      } catch {
        if (active) setIsAdmin(false);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/competitions", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, prize_pool_usd: prizePool, starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString() }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not publish competition.");
      onCreated(body.competition as CreatedCompetition);
      setTitle("");
      setDescription("");
      setPrizePool("0");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not publish competition.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !isAdmin) return null;

  return <section className="mt-8 rounded-2xl border border-amber-500/20 bg-zinc-950 p-6">
    <h2 className="text-xl font-semibold">Create a competition</h2>
    <p className="mt-2 text-sm text-zinc-400">New competitions start as upcoming and rank entries by 24-hour volume.</p>
    <p className="mt-1 text-xs text-amber-200">The prize pool is an advertised amount only. This app does not escrow or automatically pay prizes.</p>
    {error && <p role="alert" className="mt-4 rounded-lg border border-rose-900 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
    <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm text-zinc-300 sm:col-span-2">Title
        <input required minLength={3} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white" />
      </label>
      <label className="grid gap-2 text-sm text-zinc-300 sm:col-span-2">Description
        <textarea maxLength={2000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white" />
      </label>
      <label className="grid gap-2 text-sm text-zinc-300">Advertised prize pool (USD)
        <input required type="number" min="0" max="9999999999.99" step="0.01" value={prizePool} onChange={(event) => setPrizePool(event.target.value)} className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white" />
      </label>
      <span aria-hidden="true" />
      <label className="grid gap-2 text-sm text-zinc-300">Starts (your local time)
        <input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white" />
      </label>
      <label className="grid gap-2 text-sm text-zinc-300">Ends (your local time)
        <input required type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-white" />
      </label>
      <div className="sm:col-span-2"><button disabled={busy} className="rounded-lg bg-amber-400 px-4 py-2.5 font-semibold text-black disabled:opacity-50">{busy ? "Publishing…" : "Publish competition"}</button></div>
    </form>
  </section>;
}
