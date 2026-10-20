const activeCompetitions = [
  {
    label: "LIVE NOW",
    title: "Frenzy Volume Championship",
    description: "Launch in Frenzy Mode and compete by token trading volume.",
    prize: "$5,000",
    ends: "Ends in 3 days",
    accent: "orange",
  },
  {
    label: "OPEN",
    title: "Agent Builders Cup",
    description: "Showcase useful agents and earn community support.",
    prize: "$2,500",
    ends: "Ends in 8 days",
    accent: "cyan",
  },
];

const pastCompetitions = [
  { title: "Prompt Royale", winner: "Orion Labs", prize: "$3,000", date: "September 2026" },
  { title: "Tooling Sprint", winner: "Mira Chen", prize: "$1,500", date: "August 2026" },
];

export default function CompetitionsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm font-medium text-amber-300">Build · launch · compete</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Competitions</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Join community challenges, grow your AI products, and compete for creator prizes.
          </p>
        </header>

        <section className="mt-9">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Active competitions</h2>
            <span className="text-sm text-zinc-500">{activeCompetitions.length} open</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {activeCompetitions.map((competition) => (
              <article key={competition.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${
                    competition.accent === "orange"
                      ? "bg-orange-500/10 text-orange-300"
                      : "bg-cyan-500/10 text-cyan-300"
                  }`}>{competition.label}</span>
                  <span className="text-xs text-zinc-500">{competition.ends}</span>
                </div>
                <h3 className="mt-5 text-2xl font-bold">{competition.title}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-400">{competition.description}</p>
                <div className="mt-6 flex items-end justify-between border-t border-zinc-800 pt-5">
                  <div>
                    <p className="text-xs text-zinc-500">Prize pool</p>
                    <p className="mt-1 text-2xl font-bold">{competition.prize}</p>
                  </div>
                  <a href="/create" className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200">
                    Enter competition
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">Past competitions</h2>
          <div className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-950">
            {pastCompetitions.map((competition) => (
              <div key={competition.title} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <h3 className="font-semibold">{competition.title}</h3>
                  <p className="mt-1 text-sm text-zinc-500">Winner: {competition.winner} · {competition.date}</p>
                </div>
                <span className="text-sm font-semibold text-emerald-300">{competition.prize} awarded</span>
              </div>
            ))}
          </div>
        </section>
        <p className="mt-3 text-xs text-zinc-600">Sample competition data for layout preview.</p>
      </div>
    </main>
  );
}