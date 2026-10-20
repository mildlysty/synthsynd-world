"use client";

import { useEffect, useState } from "react";
import MarketplaceCard, { type MarketplaceItem } from "../../components/MarketplaceCard";

const filters = [
  { label: "All", value: "all" },
  { label: "Agents", value: "agent" },
  { label: "Prompts", value: "prompt" },
  { label: "Tools", value: "tool" },
  { label: "Skills", value: "skill" },
  { label: "MCP", value: "mcp" },
  { label: "Bundles", value: "bundle" },
] as const;
const categories = ["MCP", "Skill", "Developer", "Automation", "Data & Analytics", "Security", "Productivity", "Content & Writing", "E-Commerce", "Legal", "Gaming", "Healthcare", "Finance", "Education", "Technology", "Marketing", "Sales", "Customer Support", "Research", "Public Safety", "Other"];

export default function RegistryPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("");
  const [pricing, setPricing] = useState("all");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageSize = 24;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: String(pageSize), offset: String(page * pageSize), type });
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (pricing === "free") params.set("is_free", "true");
    if (pricing === "paid") params.set("is_free", "false");
    setLoading(true); setError("");
    fetch(`/api/v1/items?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.detail || body.error || "Could not load the marketplace registry.");
        setItems(body.items ?? []); setTotal(body.count ?? 0);
      })
      .catch((reason: unknown) => { if (reason instanceof Error && reason.name !== "AbortError") setError(reason.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [query, type, category, pricing, page]);

  function chooseType(nextType: string) { setType(nextType); setPage(0); }

  return (
    <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-purple-950/40 via-zinc-950 to-cyan-950/20 p-7 sm:p-10">
          <p className="text-sm font-medium text-cyan-300">The agent registry</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Find your next building block.</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">Discover community-published agents, prompts, tools, skills, MCP services, and bundles.</p>
          <form onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); setPage(0); }} className="mt-7 flex max-w-3xl gap-2">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or description" className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black/70 px-4 py-3 outline-none focus:border-purple-500" />
            <button className="rounded-xl bg-purple-600 px-5 py-3 font-semibold">Search</button>
          </form>
          <a href="/bundle/create" className="mt-4 inline-flex text-sm text-purple-300 hover:text-purple-200">Create a bundle →</a>
        </header>

        <div className="mt-7 flex flex-wrap gap-2" role="group" aria-label="Listing type">
          {filters.map((filter) => <button key={filter.value} onClick={() => chooseType(filter.value)} aria-pressed={type === filter.value} className={`rounded-full border px-4 py-2 text-sm ${type === filter.value ? "border-cyan-400 bg-cyan-400/10 text-cyan-100" : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"}`}>{filter.label}</button>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="text-xs text-zinc-500">Industry/category<select value={category} onChange={(event)=>{setCategory(event.target.value);setPage(0);}} className="ml-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"><option value="">All categories</option>{categories.map((item)=><option key={item} value={item}>{item}</option>)}</select></label>
          <label className="text-xs text-zinc-500">Pricing<select value={pricing} onChange={(event)=>{setPricing(event.target.value);setPage(0);}} className="ml-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"><option value="all">All prices</option><option value="free">Free</option><option value="paid">Paid</option></select></label>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm text-zinc-500"><span>{loading ? "Loading listings…" : `${total.toLocaleString()} listings`}</span><span>Page {page + 1}</span></div>
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
        {!loading && !error && items.length === 0 && <div className="mt-5 rounded-2xl border border-zinc-800 p-12 text-center text-zinc-500">No listings match this search.</div>}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => <MarketplaceCard key={item.id} item={item} />)}
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <button disabled={page === 0 || loading} onClick={() => setPage(page - 1)} className="rounded-lg border border-zinc-700 px-4 py-2 disabled:opacity-40">Previous</button>
          <button disabled={loading || (page + 1) * pageSize >= total} onClick={() => setPage(page + 1)} className="rounded-lg border border-zinc-700 px-4 py-2 disabled:opacity-40">Next</button>
        </div>
      </div>
    </main>
  );
}
