import Link from "next/link";
import BookmarkButton from "./BookmarkButton";

export type MarketplaceItem = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price_inr?: number | null;
  is_free?: boolean | null;
  statusType?: string | null;
  token_symbol?: string | null;
  category?: string | null;
  tags?: string[] | null;
  vault_mode?: boolean | null;
  token_address?: string | null;
};

export function itemHref(item: MarketplaceItem) {
  const type = (item.statusType || "agent").toLowerCase();
  if (type === "prompt") return `/prompt/${item.id}`;
  if (type === "tool") return `/tool/${item.id}`;
  if (type === "mcp") return `/mcp/${item.id}`;
  if (type === "skill") return `/skill/${item.id}`;
  if (type === "bundle") return `/bundle/${item.id}`;
  return `/agent/${item.id}`;
}

export default function MarketplaceCard({ item }: { item: MarketplaceItem }) {
  return (
    <article className="group flex min-h-[300px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 transition hover:-translate-y-0.5 hover:border-purple-700/70">
      <Link href={itemHref(item)} className="block">
        <div className="h-36 overflow-hidden bg-gradient-to-br from-purple-950/70 via-zinc-900 to-cyan-950/50">
          {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" loading="lazy" /> : <div className="grid h-full place-items-center text-4xl text-purple-300">{item.statusType === "prompt" ? "✦" : item.statusType === "tool" ? "⌘" : item.statusType === "mcp" ? "⌁" : "◈"}</div>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] uppercase tracking-wide text-zinc-400">{item.statusType || "agent"}</span>
          <span className="text-xs text-emerald-300">{item.token_symbol ? `$${item.token_symbol}` : item.category || ""}</span>
        </div>
        <Link href={itemHref(item)} className="mt-3 line-clamp-1 text-lg font-semibold hover:text-purple-200">{item.name}</Link>
        <p className="mt-2 line-clamp-3 text-sm leading-5 text-zinc-500">{item.vault_mode && item.token_address ? "Token holders can reveal this listing’s details." : item.description || "No description provided."}</p>
        {item.tags && item.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{item.tags.slice(0,3).map((tag)=><span key={tag} className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">{tag}</span>)}</div>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-5">
          <span className="font-semibold text-purple-200">{item.is_free ? "Free" : item.price_inr != null ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(item.price_inr)) : "INR price needed"}</span>
          <BookmarkButton itemId={item.id} />
        </div>
      </div>
    </article>
  );
}
