const creators = [
  { name: "Orion Labs", handle: "@orionlabs", volume: "$284,910", agents: 18, score: 98 },
  { name: "Mira Chen", handle: "@mirac", volume: "$219,480", agents: 14, score: 92 },
  { name: "Synth Guild", handle: "@synthguild", volume: "$176,205", agents: 11, score: 87 },
  { name: "Ari Systems", handle: "@arisystems", volume: "$128,740", agents: 9, score: 81 },
  { name: "Lumen Works", handle: "@lumenworks", volume: "$94,320", agents: 7, score: 76 },
];

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 to-zinc-950 p-8 sm:p-12">
          <p className="text-sm font-medium text-violet-300">Creator economy</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Leaderboard</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Creators ranked by marketplace volume and the agents they have published.
          </p>
          <div className="mt-7 grid max-w-lg grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
              <p className="text-xs text-zinc-500">Tracked volume</p>
              <p className="mt-1 text-2xl font-bold">$903K</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
              <p className="text-xs text-zinc-500">Creators</p>
              <p className="mt-1 text-2xl font-bold">1,248</p>
            </div>
          </div>
        </header>

        <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-800">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h2 className="font-semibold">Top creators <span className="text-zinc-500">· This month</span></h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  {["Rank", "Creator", "Trading volume", "Agents created", "Score"].map((heading) => (
                    <th key={heading} className="px-5 py-4 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {creators.map((creator, index) => (
                  <tr key={creator.handle} className="bg-zinc-950 hover:bg-zinc-900/60">
                    <td className="px-5 py-4 font-mono text-zinc-500">#{index + 1}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold">{creator.name}</div>
                      <div className="mt-1 text-xs text-zinc-500">{creator.handle}</div>
                    </td>
                    <td className="px-5 py-4 text-emerald-300">{creator.volume}</td>
                    <td className="px-5 py-4">{creator.agents}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-violet-200">
                        {creator.score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <p className="mt-3 text-xs text-zinc-600">Sample leaderboard data for layout preview.</p>
      </div>
    </main>
  );
}