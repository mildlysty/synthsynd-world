import Link from "next/link";

const endpoint = "/api/v1/items";

export default function DevelopersPage() {
  return (
    <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-violet-950/50 to-zinc-950 p-8 sm:p-12">
          <p className="text-sm font-medium text-violet-300">Synthsynd World API</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Build with the marketplace</h1>
          <p className="mt-4 max-w-2xl text-zinc-400">
            Browse public agents, prompts, tools, and MCP listings through REST or connect an MCP client to the marketplace tools.
          </p>
          <Link href="/api-keys" className="mt-6 inline-flex rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400">
            Manage API keys
          </Link>
          <Link href="/openapi.json" className="ml-3 mt-6 inline-flex rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-900">
            OpenAPI specification
          </Link>
        </header>

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">GET</p>
              <h2 className="mt-2 font-mono text-lg">{endpoint}</h2>
            </div>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">Public read endpoint</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            Supports <code className="text-zinc-200">q</code>, <code className="text-zinc-200">type</code>, <code className="text-zinc-200">limit</code>, and <code className="text-zinc-200">offset</code>. The maximum page size is 100.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-xl border border-zinc-800 bg-black p-4 text-sm text-emerald-200"><code>{`curl "${endpoint}?type=agent&q=research&limit=20&offset=0"`}</code></pre>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-zinc-800 bg-black p-4 text-xs leading-6 text-zinc-300"><code>{`{
  "items": [
    {
      "id": "…",
      "name": "…",
      "description": "…",
      "image_url": "…",
      "price_usd": 0,
      "user_id": "…",
      "is_free": true,
      "created_at": "…",
      "statusType": "agent",
      "token_address": null
    }
  ],
  "count": 1,
  "limit": 20,
  "offset": 0
}`}</code></pre>
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">POST</p>
          <h2 className="mt-2 font-mono text-lg">/mcp</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">Streamable HTTP JSON-RPC endpoint. Create an API key, then send it as a Bearer token. The available read-only tools are <code className="text-zinc-200">search_marketplace</code> and <code className="text-zinc-200">get_listing</code>.</p>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-zinc-800 bg-black p-4 text-xs leading-6 text-zinc-300"><code>{`curl -X POST http://localhost:3000/mcp \\
  -H "Authorization: Bearer $SYNTHSYND_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}</code></pre>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">POST · API key required</p>
            <h2 className="mt-2 font-mono text-lg">/api/swarms/agent-completions</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">Run a task with one agent configuration. Responses use your configured model and debit credits from the account that owns the key.</p>
            <pre className="mt-4 overflow-x-auto rounded-xl border border-zinc-800 bg-black p-4 text-xs leading-6 text-zinc-300"><code>{`curl -X POST http://localhost:3000/api/swarms/agent-completions -H "Authorization: Bearer $SYNTHSYND_API_KEY" -H "Content-Type: application/json" -d '{"agent_config":{"name":"Researcher"},"task":"Summarize marketplace activity."}'`}</code></pre>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">POST · API key required</p>
            <h2 className="mt-2 font-mono text-lg">/api/swarms/swarm-completions</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">Run 2–5 configured agents in parallel, then synthesize their results. Each agent call and the synthesis call consume one inference credit unit; configure the unit cost with <code>API_INFERENCE_CREDITS</code>.</p>
          </article>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="font-semibold">Supported filters</h2>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li><code className="text-zinc-200">type</code>: agent, prompt, tool, mcp, or all</li>
              <li><code className="text-zinc-200">q</code>: searches item names and descriptions</li>
              <li><code className="text-zinc-200">limit</code> / <code className="text-zinc-200">offset</code>: paginated results</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-6">
            <h2 className="font-semibold text-amber-100">Publishing and payments</h2>
            <p className="mt-3 text-sm leading-6 text-amber-100/70">
            Compatibility routes include publishing, editing, reviews, owner products, paid-content access, token linking, and bundle creation. Inference needs OpenAI and Supabase service-role configuration plus account credits. Stripe checkout requires completed seller onboarding and webhook setup. Token launch and creator-fee claims use Jupiter Studio when configured; x402 settlement still needs a payment facilitator.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
