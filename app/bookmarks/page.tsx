"use client";

import { useEffect, useState } from "react";
import MarketplaceCard, { type MarketplaceItem } from "../components/MarketplaceCard";
import { getBookmarkedIds } from "../components/BookmarkButton";

const EVENT_NAME = "synthsynd-world:bookmarks-changed";

export default function BookmarksPage() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const ids = getBookmarkedIds();
      if (!ids.length) { setItems([]); setLoading(false); return; }
      setLoading(true); setError("");
      const results = await Promise.all(ids.map(async (id) => {
        const response = await fetch(`/api/v1/items/${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Some saved listings could not be loaded.");
        const body = await response.json();
        return body.item as MarketplaceItem;
      }));
      if (active) setItems(results);
    }
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load bookmarks."); })
      .finally(() => { if (active) setLoading(false); });
    const refresh = () => { setLoading(true); load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load bookmarks."); }).finally(() => { if (active) setLoading(false); }); };
    window.addEventListener(EVENT_NAME, refresh);
    window.addEventListener("storage", refresh);
    return () => { active = false; window.removeEventListener(EVENT_NAME, refresh); window.removeEventListener("storage", refresh); };
  }, []);

  return <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8"><div className="mx-auto max-w-7xl">
    <p className="text-sm font-medium text-cyan-300">Your collection</p><h1 className="mt-2 text-4xl font-bold">Bookmarks</h1>
    <p className="mt-3 text-zinc-400">Saved in this browser, no account required.</p>
    {error && <p role="alert" className="mt-5 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-rose-200">{error}</p>}
    {loading ? <p className="mt-8 text-zinc-500">Loading bookmarks…</p> : !error && items.length === 0 ? <p className="mt-8 rounded-2xl border border-zinc-800 p-10 text-center text-zinc-500">No bookmarks yet. Save a listing from the marketplace to find it here.</p> :
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((item) => <MarketplaceCard key={item.id} item={item} />)}</div>}
  </div></main>;
}
