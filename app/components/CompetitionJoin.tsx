"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

type Listing = { id: string; name: string; token_symbol: string | null; token_address: string };
export default function CompetitionJoin({ competitionId, endsAt }: { competitionId: string; endsAt: string }) {
  const [ownerId, setOwnerId] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [selected, setSelected] = useState("");
  const [entered, setEntered] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const owner = data.session?.user.id;
      if (!owner) return;
      const [{ data: ownListings }, { data: existing }] = await Promise.all([
        supabase.from("agents").select("id,name,token_symbol,token_address").eq("owner_id", owner).not("token_address", "is", null).order("created_at", { ascending: false }),
        supabase.from("marketplace_competition_entries").select("listing_id").eq("competition_id", competitionId).eq("owner_id", owner),
      ]);
      if (!active) return;
      setOwnerId(owner); setListings((ownListings ?? []) as Listing[]); setEntered((existing ?? []).map((entry) => entry.listing_id));
      setSelected((ownListings ?? []).find((item) => !existing?.some((entry) => entry.listing_id === item.id))?.id || "");
    });
    return () => { active = false; };
  }, [competitionId]);
  async function join() {
    if (!ownerId || !selected) return;
    setBusy(true); setError(""); setNotice("");
    const { error: insertError } = await supabase.from("marketplace_competition_entries").insert({ competition_id: competitionId, listing_id: selected, owner_id: ownerId });
    if (insertError) setError(insertError.code === "23505" ? "This listing already entered." : "Could not enter this listing. Check the competition window and migration setup.");
    else { setEntered((current) => [...current, selected]); setNotice("Listing entered. Current market metrics will appear if Jupiter has indexed its token."); }
    setBusy(false);
  }
  if (!ownerId) return <Link href="/signin" className="mt-5 inline-block text-sm text-amber-300">Sign in to enter an eligible token listing →</Link>;
  if (!listings.length) return <p className="mt-5 text-sm text-zinc-500">Publish a listing and attach its token address before entering.</p>;
  if (new Date(endsAt).getTime() <= Date.now()) return <p className="mt-5 text-sm text-zinc-500">Entry has closed.</p>;
  const available = listings.filter((listing) => !entered.includes(listing.id));
  return <div className="mt-5 border-t border-zinc-800 pt-4"><div className="flex flex-wrap gap-2"><select value={selected} onChange={(event)=>setSelected(event.target.value)} disabled={!available.length || busy} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm"><option value="">{available.length ? "Select your token listing" : "All your listings entered"}</option>{available.map((listing)=><option key={listing.id} value={listing.id}>{listing.token_symbol ? `$${listing.token_symbol} · ` : ""}{listing.name}</option>)}</select><button onClick={join} disabled={!selected || busy || !available.length} className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50">{busy ? "Entering…" : "Enter listing"}</button></div>{notice&&<p role="status" className="mt-3 text-xs text-emerald-300">{notice}</p>}{error&&<p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}</div>;
}
