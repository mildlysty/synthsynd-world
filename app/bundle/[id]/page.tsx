import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../utils/supabase";
import MarketplaceCard, { type MarketplaceItem } from "../../components/MarketplaceCard";
import BuyButton from "../../components/BuyButton";

export default async function BundlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: bundle } = await supabase.from("marketplace_bundles")
    .select("id,name,description,image_url,price_inr,is_free,created_at")
    .eq("id", id).eq("status", "published").maybeSingle();
  if (!bundle) notFound();
  const { data: links } = await supabase.from("marketplace_bundle_items").select("item_id,position").eq("bundle_id", id).order("position");
  const ids = (links ?? []).map((link) => link.item_id);
  const { data: rows } = ids.length ? await supabase.from("agents")
    .select("id,name,description,image_url,price_inr,is_free,statusType,token_symbol,category,tags")
    .in("id", ids) : { data: [] };
  const byId = new Map((rows ?? []).map((item) => [item.id, item]));
  const items = ids.map((itemId) => byId.get(itemId)).filter(Boolean) as MarketplaceItem[];
  return <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8"><div className="mx-auto max-w-7xl">
    <Link href="/platform/registry" className="text-sm text-purple-300">← Marketplace</Link>
    <header className="mt-5 grid gap-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-7 sm:grid-cols-[220px_1fr] sm:p-10">
      <div className="grid min-h-40 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-950 to-cyan-950 text-5xl">{bundle.image_url?<img src={bundle.image_url} alt="" className="h-full w-full object-cover"/>:"◈"}</div>
      <div><p className="text-xs uppercase tracking-wide text-cyan-300">Bundle</p><h1 className="mt-2 text-4xl font-bold">{bundle.name}</h1><p className="mt-3 whitespace-pre-wrap leading-7 text-zinc-400">{bundle.description}</p><p className="mt-5 text-xl font-semibold text-purple-200">{bundle.is_free?"Free bundle":bundle.price_inr != null ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(bundle.price_inr)) : "INR price needed"}</p><div className="mt-5 max-w-sm"><BuyButton bundleId={bundle.id} isFree={bundle.is_free} /></div></div>
    </header>
    <div className="mt-9 flex items-end justify-between"><h2 className="text-2xl font-semibold">Included listings</h2><span className="text-sm text-zinc-500">{items.length}</span></div>
    {items.length===0?<p className="mt-5 text-zinc-500">This bundle has no available listings.</p>:<div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((item)=><MarketplaceCard key={item.id} item={item}/>)}</div>}
  </div></main>;
}
