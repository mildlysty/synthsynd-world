"use client";

import { useState } from "react";

const listings = [
  { symbol: "$NOVA", name: "Nova Agent", type: "Agents", price: "$0.084", change: "+12.8%", mcap: "$840K", volume: "$126K", traders: 328, trading: true, isNew: true },
  { symbol: "$ORBIT", name: "Orbit Prompt", type: "Prompts", price: "$0.031", change: "+8.2%", mcap: "$310K", volume: "$58K", traders: 176, trading: true, isNew: false },
  { symbol: "$MIND", name: "Mindful Analyst", type: "Agents", price: "$0.017", change: "-2.1%", mcap: "$170K", volume: "$21K", traders: 84, trading: false, isNew: true },
  { symbol: "$FLOW", name: "Workflow Kit", type: "Prompts", price: "$0.009", change: "+3.4%", mcap: "$91K", volume: "$13K", traders: 52, trading: true, isNew: false },
];

const filters = ["All", "Agents", "Prompts", "Trading", "New"] as const;
type Filter = (typeof filters)[number];

export default function ScreenerPage() {
  const [filter, setFilter] = useState<Filter>("All");

  const visibleListings = listings.filter((item) => {
    if (filter === "All") return true;
    if (filter === "Trading") return item.trading;
    if (filter === "New") return item.isNew;
    return item.type === filter;
  });

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm font-medium text-cyan-400">Market overview</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Token Screener</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Explore tokenized agents and prompts by market activity.
          </p>
        </header>

        <div className="mt-8 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              aria-pressed={filter === item}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                filter === item
                  ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                {["Token", "Type", "Price", "24h", "Market cap", "Volume", "Traders"].map((heading) => (
                  <th key={heading} className="px-5 py-4 font-medium">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950">
              {visibleListings.map((item) => (
                <tr key={item.symbol} className="hover:bg-zinc-900/60">
                  <td className="px-5 py-4">
                    <span className="font-semibold">{item.symbol}</span>
                    <span className="ml-2 text-zinc-500">{item.name}</span>
                  </td>
                  <td className="px-5 py-4 text-zinc-400">{item.type}</td>
                  <td className="px-5 py-4">{item.price}</td>
                  <td className={`px-5 py-4 ${item.change.startsWith("+") ? "text-emerald-300" : "text-rose-300"}`}>
                    {item.change}
                  </td>
                  <td className="px-5 py-4">{item.mcap}</td>
                  <td className="px-5 py-4">{item.volume}</td>
                  <td className="px-5 py-4">{item.traders}</td>
                </tr>
              ))}
              {visibleListings.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-zinc-500">No listings match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-600">Sample data for layout preview.</p>
      </div>
    </main>
  );
}