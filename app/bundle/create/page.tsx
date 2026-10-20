"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../utils/supabase";

type OwnedItem = { id: string; name: string; statusType: string | null };

export default function CreateBundlePage() {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ownedItems, setOwnedItems] = useState<OwnedItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [price, setPrice] = useState("0");
  const [isFree, setIsFree] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const owner = data.session?.user.id;
      if (!owner) { if (active) setLoading(false); return; }
      const { data: items } = await supabase.from("agents").select("id,name,statusType").eq("owner_id", owner).order("created_at", { ascending: false });
      if (active) { setOwnerId(owner); setOwnedItems(items ?? []); setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!ownerId || selected.length === 0) { setError("Sign in and select at least one listing."); return; }
    setSaving(true); setError("");
    const bundleId = crypto.randomUUID();
    const { error: bundleError } = await supabase.from("marketplace_bundles").insert({
      id: bundleId, owner_id: ownerId, name: name.trim(), description: description.trim(),
      image_url: imageUrl.trim() || null, is_free: isFree, price_usd: isFree ? 0 : Number(price), status: "published",
      category: category.trim() || null, tags: tags.split(",").map((tag)=>tag.trim()).filter(Boolean).slice(0,20),
    });
    if (bundleError) { setSaving(false); setError(`Could not create bundle: ${bundleError.message}`); return; }
    const { error: itemsError } = await supabase.from("marketplace_bundle_items").insert(selected.map((itemId, position) => ({ bundle_id: bundleId, item_id: itemId, position })));
    if (itemsError) {
      await supabase.from("marketplace_bundles").delete().eq("id", bundleId).eq("owner_id", ownerId);
      setSaving(false); setError(`Could not add bundle listings: ${itemsError.message}`); return;
    }
    router.push(`/bundle/${bundleId}`);
  }

  if (loading) return <main className="p-10 text-zinc-400">Loading account…</main>;
  if (!ownerId) return <main className="p-10 text-center text-zinc-100"><h1 className="text-3xl font-bold">Create a bundle</h1><p className="mt-3 text-zinc-400">Sign in before publishing a bundle.</p><Link href="/signin" className="mt-5 inline-block rounded-lg bg-purple-600 px-4 py-2">Sign in</Link></main>;

  return <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8"><div className="mx-auto max-w-3xl"><Link href="/platform/registry" className="text-sm text-purple-300">← Registry</Link><h1 className="mt-5 text-4xl font-bold">Create a bundle</h1><p className="mt-3 text-zinc-400">Package your published listings together. Paid bundle checkout requires payment setup.</p>
    {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
    <form onSubmit={create} className="mt-7 space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <label className="block text-sm text-zinc-400">Bundle name<input required minLength={2} maxLength={120} value={name} onChange={(e)=>setName(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white" /></label>
      <label className="block text-sm text-zinc-400">Description<textarea value={description} onChange={(e)=>setDescription(e.target.value)} maxLength={5000} rows={4} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white" /></label>
      <label className="block text-sm text-zinc-400">Image URL<input type="url" value={imageUrl} onChange={(e)=>setImageUrl(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white" /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-zinc-400">Category<input maxLength={80} value={category} onChange={(e)=>setCategory(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white" /></label><label className="block text-sm text-zinc-400">Tags<input maxLength={500} value={tags} onChange={(e)=>setTags(e.target.value)} placeholder="research, automation" className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white" /></label></div>
      <fieldset><legend className="text-sm text-zinc-400">Listings to include</legend>{ownedItems.length===0?<p className="mt-2 text-sm text-zinc-500">Publish at least one listing first.</p>:<div className="mt-2 max-h-60 space-y-2 overflow-auto rounded-xl border border-zinc-800 p-3">{ownedItems.map((item)=><label key={item.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-zinc-900"><input type="checkbox" checked={selected.includes(item.id)} onChange={(event)=>setSelected((current)=>event.target.checked?[...current,item.id]:current.filter((id)=>id!==item.id))} /><span>{item.name}</span><span className="ml-auto text-xs uppercase text-zinc-500">{item.statusType||"agent"}</span></label>)}</div>}</fieldset>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={isFree} onChange={(e)=>setIsFree(e.target.checked)} />Free bundle</label>
      {!isFree&&<label className="block text-sm text-zinc-400">Price (USD)<input required min="0.01" step="0.01" type="number" value={price} onChange={(e)=>setPrice(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white" /></label>}
      <button disabled={saving||ownedItems.length===0} className="rounded-xl bg-purple-600 px-5 py-3 font-semibold disabled:opacity-50">{saving?"Publishing…":"Publish bundle"}</button>
    </form>
  </div></main>;
}
