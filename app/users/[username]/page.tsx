import { notFound } from "next/navigation";
import { supabase } from "../../../utils/supabase";
import MarketplaceCard, { type MarketplaceItem } from "../../components/MarketplaceCard";

export default async function PublicProfile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const normalized = username.toLowerCase();
  const { data: marketplaceProfile } = await supabase.from("marketplace_profiles")
    .select("owner_id,username,display_name,bio,avatar_url,website_url")
    .eq("username", normalized).maybeSingle();

  let profile: { username: string; displayName: string; bio: string; avatarUrl: string | null; websiteUrl: string | null; wallet: string | null };
  let items: MarketplaceItem[] = [];
  if (marketplaceProfile) {
    profile = {
      username: marketplaceProfile.username,
      displayName: marketplaceProfile.display_name || marketplaceProfile.username,
      bio: marketplaceProfile.bio || "",
      avatarUrl: marketplaceProfile.avatar_url,
      websiteUrl: marketplaceProfile.website_url,
      wallet: null,
    };
    const { data } = await supabase.from("agents")
      .select("id,name,description,image_url,price_usd,is_free,statusType,token_symbol,vault_mode,token_address")
      .eq("owner_id", marketplaceProfile.owner_id)
      .order("created_at", { ascending: false });
    items = (data ?? []) as MarketplaceItem[];
  } else {
    const { data: legacyProfile } = await supabase.from("profiles")
      .select("username,wallet_address")
      .eq("username", normalized).maybeSingle();
    if (!legacyProfile) notFound();
    profile = { username: legacyProfile.username, displayName: legacyProfile.username, bio: "", avatarUrl: null, websiteUrl: null, wallet: legacyProfile.wallet_address };
    const { data } = await supabase.from("agents")
      .select("id,name,description,image_url,price_usd,is_free,statusType,token_symbol,vault_mode,token_address")
      .eq("user_id", legacyProfile.wallet_address)
      .order("created_at", { ascending: false });
    items = (data ?? []) as MarketplaceItem[];
  }

  return <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8"><div className="mx-auto max-w-7xl">
    <section className="flex flex-wrap items-center gap-5 border-b border-zinc-800 pb-8">
      {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" /> : <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-purple-700 to-cyan-700 text-3xl">{profile.displayName.slice(0,1).toUpperCase()}</div>}
      <div className="min-w-0 flex-1"><p className="text-sm text-zinc-500">Creator profile</p><h1 className="mt-1 text-3xl font-bold">{profile.displayName}</h1><p className="mt-1 text-purple-300">@{profile.username}</p>{profile.bio&&<p className="mt-3 max-w-2xl text-zinc-400">{profile.bio}</p>}{profile.wallet&&<p className="mt-2 font-mono text-xs text-zinc-600">Wallet: {profile.wallet}</p>}</div>
      {profile.websiteUrl&&<a href={profile.websiteUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">Website ↗</a>}
    </section>
    <div className="mt-8 flex items-end justify-between"><h2 className="text-2xl font-semibold">Published listings</h2><span className="text-sm text-zinc-500">{items.length}</span></div>
    {items.length===0?<p className="mt-6 text-zinc-500">No public listings yet.</p>:<div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((item)=><MarketplaceCard key={item.id} item={item} />)}</div>}
  </div></main>;
}
