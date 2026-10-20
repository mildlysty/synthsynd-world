"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

type OwnedItem = { id: string; name: string; description: string | null; statusType: string | null; created_at: string | null };

export default function ProfilePage() {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [items, setItems] = useState<OwnedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load(owner: string | null) {
      setOwnerId(owner);
      if (!owner) { setItems([]); setLoading(false); return; }
      setLoading(true); setError("");
      const { data, error: queryError } = await supabase.from("agents")
        .select("id,name,description,statusType,created_at")
        .eq("owner_id", owner)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (queryError) setError("Could not load your listings. Apply the account ownership migration and check the agents table permissions.");
      else setItems(data ?? []);
      setLoading(false);
    }
    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => load(session?.user.id ?? null));
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  if (!ownerId && !loading) return <main className="p-10 text-center text-zinc-100"><h1 className="text-3xl font-bold">My listings</h1><p className="mt-3 text-zinc-400">Sign in to manage your published items.</p><Link href="/signin" className="mt-5 inline-block rounded-lg bg-purple-600 px-4 py-2 font-semibold">Sign in</Link></main>;

  return <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8"><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-cyan-300">Creator dashboard</p><h1 className="mt-2 text-4xl font-bold">My listings</h1></div><Link href="/launch" className="rounded-lg bg-purple-600 px-4 py-2.5 font-semibold">Publish a listing</Link></div>
    {error && <p role="alert" className="mt-6 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
    {loading ? <p className="mt-8 text-zinc-500">Loading listings…</p> : !error && items.length === 0 ? <p className="mt-8 rounded-2xl border border-zinc-800 p-10 text-center text-zinc-500">You haven’t published anything yet.</p> :
      <div className="mt-7 divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800">{items.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 bg-zinc-950 p-5"><div><div className="flex items-center gap-3"><h2 className="font-semibold">{item.name}</h2><span className="rounded-full bg-zinc-900 px-2 py-1 text-[11px] uppercase text-zinc-500">{item.statusType || "agent"}</span></div><p className="mt-1 line-clamp-1 text-sm text-zinc-500">{item.description}</p></div><div className="flex gap-2"><Link href={`/agent/${item.id}`} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm">View</Link><Link href={`/edit/${item.id}`} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm">Edit</Link></div></article>)}</div>}
  </div></main>;
}
