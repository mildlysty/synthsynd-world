"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

export default function ListingContent({ id, type, isFree }: { id: string; type: string; isFree: boolean }) {
  const [content, setContent] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const response = await fetch(`/api/v1/items/${encodeURIComponent(id)}`, {
        headers: data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {},
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load listing content.");
      if (active) {
        setContent(typeof result.item?.content === "string" ? result.item.content : null);
        setLoaded(true);
      }
    })().catch((reason: unknown) => {
      if (active) { setError(reason instanceof Error ? reason.message : "Could not load listing content."); setLoaded(true); }
    });
    return () => { active = false; };
  }, [id]);
  if (!loaded) return <p className="mt-8 text-sm text-zinc-500">Loading listing content…</p>;
  if (!content && !isFree) return <p className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">Purchase this listing to access its source or prompt. If you have already purchased it, refresh after checkout.</p>;
  if (!content) return error ? <p role="alert" className="mt-8 text-sm text-rose-300">{error}</p> : null;
  return <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{type === "prompt" ? "Prompt" : type === "skill" ? "Skill content" : "Source"}</h2>{type === "prompt" && <Link href={`/prompt/${id}/chat`} className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold">Run prompt</Link>}</div><pre className="max-h-[600px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black p-4 font-mono text-xs leading-6 text-zinc-300">{content}</pre></section>;
}
