import Link from "next/link";

const rows = [
  { name: "Standard", creator: "0.5%", platform: "0.5%", combined: "1%", detail: "Creator and platform fees are split equally across buys and sells." },
  { name: "Frenzy", creator: "1%", platform: "1%", combined: "2%", detail: "Double creator fee; Frenzy listings can participate in volume competitions." },
];

export default function TokenizationPricingPage() {
  return <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8"><div className="mx-auto max-w-5xl">
    <p className="text-sm font-medium text-cyan-300">Token economy</p><h1 className="mt-2 text-4xl font-bold">Tokenization pricing</h1>
    <p className="mt-3 max-w-2xl text-zinc-400">Create a token for an agent listing through Jupiter Studio. The server builds the transaction; your connected Solana wallet signs it. Configure the Jupiter Studio API key before launch is available.</p>
    <section className="mt-8 grid gap-4 sm:grid-cols-2"><article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"><p className="text-sm text-zinc-500">One-time launch cost</p><p className="mt-2 text-3xl font-bold">0.04 SOL</p><p className="mt-3 text-sm text-zinc-400">The reference covers mint, bonding curve, and metadata deployment.</p></article><article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"><p className="text-sm text-zinc-500">Recurring platform fee</p><p className="mt-2 text-3xl font-bold">None</p><p className="mt-3 text-sm text-zinc-400">Ongoing costs depend on configured network and launch providers.</p></article></section>
    <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-800"><div className="border-b border-zinc-800 p-5"><h2 className="font-semibold">Trade fee split</h2></div><div className="divide-y divide-zinc-800">{rows.map((row)=><article key={row.name} className="grid gap-4 bg-zinc-950 p-5 sm:grid-cols-[1fr_auto_auto_auto]"><div><h3 className="font-semibold">{row.name}</h3><p className="mt-1 text-sm text-zinc-500">{row.detail}</p></div><div><p className="text-xs text-zinc-500">Creator</p><p className="mt-1 font-semibold">{row.creator}</p></div><div><p className="text-xs text-zinc-500">Platform</p><p className="mt-1 font-semibold">{row.platform}</p></div><div><p className="text-xs text-zinc-500">Total</p><p className="mt-1 font-semibold">{row.combined}</p></div></article>)}</div></section>
    <p className="mt-4 text-xs leading-5 text-zinc-600">Launch fees are set by Jupiter Studio and the connected network. The fee percentages above are this app's configuration presets; they may differ from Jupiter's final on-chain fee configuration. Always review the wallet transaction before signing.</p>
    <Link href="/launch?type=agent" className="mt-7 inline-flex rounded-xl bg-purple-600 px-5 py-3 font-semibold">Prepare a listing</Link>
  </div></main>;
}
