import Link from "next/link";
import { supabase } from "../../utils/supabase";

type MarketplaceItem = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_inr: number | null;
  is_free: boolean | null;
  user_id: string | null;
  statusType: string | null;
  created_at: string | null;
  mcp_server_url: string | null;
};

export default async function McpServersPage() {
  const { data, error } = await supabase
    .from("agents")
    .select("id,name,description,image_url,price_inr,is_free,user_id,statusType,created_at,mcp_server_url")
    .eq("statusType", "mcp")
    .order("created_at", { ascending: false })
    .limit(48);

  const servers = (data ?? []) as MarketplaceItem[];

  return (
    <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl border border-emerald-500/15 bg-gradient-to-br from-emerald-950/45 via-zinc-900 to-zinc-950 p-8 sm:p-12">
          <p className="text-sm font-medium text-emerald-300">Connect agents to tools</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">MCP Servers</h1>
          <p className="mt-4 max-w-2xl text-zinc-300">
            Browse Model Context Protocol servers published to the Synthsynd marketplace.
            Each listing can describe the tools and services it makes available to an agent.
          </p>
          <Link href="/create?type=mcp" className="mt-6 inline-flex rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-300">
            Publish a server
          </Link>
        </header>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Available servers</h2>
            <p className="mt-1 text-sm text-zinc-500">{servers.length} listings</p>
          </div>
          <Link href="/developers" className="text-sm text-emerald-300 hover:text-emerald-200">Developer API →</Link>
        </div>

        {error ? (
          <div role="alert" className="mt-5 rounded-xl border border-rose-900/70 bg-rose-950/30 p-5 text-sm text-rose-200">
            Could not load MCP listings. Check the Supabase connection and the agents table policy.
          </div>
        ) : servers.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-14 text-center">
            <h3 className="text-lg font-semibold">No MCP servers published yet</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">
              Publish a server listing to make it discoverable here. Add a server URL and connection details when the MCP publishing fields are configured for your database.
            </p>
            <Link href="/create?type=mcp" className="mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-800">
              Start a listing
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {servers.map((server) => (
              <article key={server.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
                {server.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={server.image_url} alt="" className="h-40 w-full object-cover" />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-gradient-to-br from-emerald-950 to-zinc-900 text-4xl font-bold text-emerald-300">M</div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-semibold">{server.name}</h3>
                    <span className="shrink-0 rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">
                      {server.is_free ? "Free" : server.price_inr != null ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(server.price_inr)) : "INR price needed"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">{server.description || "No description provided."}</p>
                  {server.mcp_server_url && <p className="mt-3 truncate font-mono text-xs text-emerald-300">{server.mcp_server_url}</p>}
                  <Link href={`/agent/${server.id}`} className="mt-5 inline-flex rounded-lg border border-zinc-700 px-3.5 py-2 text-sm font-medium hover:border-emerald-500/50 hover:text-emerald-200">
                    View server listing
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
