"use client";

import { useState } from "react";

const tokens = [
  { symbol: "$NOVA", name: "Nova Agent", price: "$0.084", mcap: "$840K", volume: "$126K", traders: 328 },
  { symbol: "$SWARM", name: "Swarm Research", price: "$0.052", mcap: "$521K", volume: "$94K", traders: 241 },
  { symbol: "$ORBIT", name: "Orbit Prompt", price: "$0.031", mcap: "$310K", volume: "$58K", traders: 176 },
];

export default function FrenzyPage() {
  const [kind, setKind] = useState<"Agent" | "Prompt">("Agent");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-950/60 via-zinc-900 to-zinc-950 p-7 sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">
            Token launchpad
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Launch in Frenzy Mode
          </h1>
          <p className="mt-4 max-w-2xl text-zinc-300">
            Bring your AI product onchain. Launch a token, reach the marketplace, and
            follow trading activity from one place.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 grid gap-4 rounded-2xl border border-zinc-700 bg-zinc-950/80 p-4 sm:grid-cols-[1fr_auto_auto]"
          >
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-zinc-400">Product name</span>
              <input
                required
                name="name"
                placeholder="e.g. Nova Research Agent"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-orange-400"
              />
            </label>

            <div>
              <span className="mb-2 block text-xs font-medium text-zinc-400">Product type</span>
              <div className="flex rounded-xl border border-zinc-700 bg-zinc-900 p-1">
                {(["Agent", "Prompt"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setKind(option)}
                    aria-pressed={kind === option}
                    className={`rounded-lg px-4 py-2 text-sm ${
                      kind === option ? "bg-orange-500 font-semibold text-black" : "text-zinc-400"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <button className="self-end rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-black transition hover:bg-orange-400">
              Continue
            </button>
          </form>
          {submitted && (
            <p role="status" className="mt-3 text-sm text-orange-300">
              Demo form submitted for a new {kind.toLowerCase()}. Connect your launch flow to publish it.
            </p>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-orange-400">Live market</p>
              <h2 className="mt-1 text-2xl font-bold">Trending tokens</h2>
            </div>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
              ● Market active
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  {["Token", "Price", "MCAP", "Volume", "Traders"].map((heading) => (
                    <th key={heading} className="px-5 py-4 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-950">
                {tokens.map((token) => (
                  <tr key={token.symbol} className="hover:bg-zinc-900/60">
                    <td className="px-5 py-4">
                      <div className="font-semibold">{token.symbol}</div>
                      <div className="mt-1 text-xs text-zinc-500">{token.name}</div>
                    </td>
                    <td className="px-5 py-4">{token.price}</td>
                    <td className="px-5 py-4">{token.mcap}</td>
                    <td className="px-5 py-4 text-emerald-300">{token.volume}</td>
                    <td className="px-5 py-4">{token.traders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}