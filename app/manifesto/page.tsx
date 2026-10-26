import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Our Manifesto | Synthsynd World',
  description: 'Why Synthsynd World exists: to make useful AI agents, tools, prompts, and skills easier to discover and share.',
  alternates: { canonical: '/manifesto' },
  openGraph: {
    title: 'Our Manifesto | Synthsynd World',
    description: 'Useful AI work should be easier to find and easier to share.',
    url: '/manifesto',
    siteName: 'Synthsynd World',
    type: 'article',
  },
  twitter: { card: 'summary', title: 'Our Manifesto | Synthsynd World', description: 'Useful AI work should be easier to find and easier to share.' },
};

const principles = [
  {
    number: '01',
    title: 'Usefulness over spectacle',
    body: 'A good agent or prompt should help someone do a real task. We care about what people can try, learn from, and improve—not just what looks impressive in a demo.',
  },
  {
    number: '02',
    title: 'Make good work easier to find',
    body: 'Creators build agents, tools, prompts, and skills every day. Synthsynd World gives that work a place to be presented and discovered by people looking for it.',
  },
  {
    number: '03',
    title: 'Give creators room to build',
    body: 'Creators can publish listings and choose whether to offer them free or at a price. A listing is a way to reach an audience; sales and income are never guaranteed.',
  },
  {
    number: '04',
    title: 'Be clear about what is real',
    body: 'Listings are submitted by their creators. Moderation can review or remove content, but a listing is not automatically audited, endorsed, or guaranteed to work as described.',
  },
  {
    number: '05',
    title: 'Build in the open',
    body: 'We are still improving the product. We will show what is available, be direct about limitations, listen to feedback, and make progress visible one step at a time.',
  },
];

export default function ManifestoPage() {
  const ca = process.env.NEXT_PUBLIC_SSDY_CA?.trim() || '5kkYSNkWgn6DCkTkPRbKKEZtmzVzVWXSR9R9PK5Ppump';
  const pumpFunUrl = process.env.NEXT_PUBLIC_SSDY_PUMPFUN_URL?.trim() || `https://pump.fun/coin/${ca}`;

  return (
    <main className="min-h-screen overflow-hidden bg-[#07090d] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(120,91,220,0.15),transparent_46%)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <Link href="/" className="text-sm font-semibold tracking-[.14em] text-zinc-100 hover:text-cyan-200">SYNTHSYND <span className="text-violet-300">WORLD</span></Link>
          <Link href="/marketplace" className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-cyan-200/50 hover:bg-white/[.04]">Explore marketplace <span aria-hidden="true">↗</span></Link>
        </header>

        <section className="grid gap-8 pb-14 pt-14 sm:pb-20 sm:pt-20 md:grid-cols-[1.2fr_.8fr] md:items-end">
          <div>
            <p className="text-xs font-bold tracking-[.22em] text-cyan-200">WHAT WE BELIEVE</p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[.98] tracking-[-.055em] sm:text-7xl">Useful AI work should be easier to <span className="text-violet-300">find</span> and <span className="text-violet-300">share.</span></h1>
          </div>
          <p className="max-w-xl text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">People are making agents, tools, prompts, and skills that can help others get real work done. We are building Synthsynd World to give that work a place to be discovered—and give creators a practical way to publish it.</p>
        </section>

        <section className="grid gap-4 border-y border-white/10 py-8 sm:grid-cols-3 sm:gap-8 sm:py-10" aria-label="What Synthsynd World is for">
          <div><p className="text-xs font-bold tracking-[.16em] text-zinc-500">DISCOVER</p><p className="mt-2 text-lg font-semibold">Find work made by people</p><p className="mt-2 text-sm leading-6 text-zinc-400">Browse community listings across agents, prompts, tools, and skills.</p></div>
          <div><p className="text-xs font-bold tracking-[.16em] text-zinc-500">PUBLISH</p><p className="mt-2 text-lg font-semibold">Put your work in context</p><p className="mt-2 text-sm leading-6 text-zinc-400">Create a listing with details that help people understand what it does.</p></div>
          <div><p className="text-xs font-bold tracking-[.16em] text-zinc-500">IMPROVE</p><p className="mt-2 text-lg font-semibold">Learn from real use</p><p className="mt-2 text-sm leading-6 text-zinc-400">Feedback and iteration matter more than polished promises.</p></div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-bold tracking-[.2em] text-cyan-200">OUR PRINCIPLES</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">How we want to build</h2></div>
            <p className="max-w-md text-sm leading-6 text-zinc-400">A marketplace earns trust through clear expectations and useful work, one listing at a time.</p>
          </div>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {principles.map((item) => (
              <article key={item.number} className="grid gap-3 py-6 sm:grid-cols-[70px_1fr_1.15fr] sm:items-start sm:gap-6">
                <span className="font-mono text-sm text-violet-300">{item.number}</span>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm leading-6 text-zinc-400">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 rounded-2xl border border-white/10 bg-white/[.025] p-6 sm:grid-cols-[1fr_1.1fr] sm:p-8">
          <div><p className="text-xs font-bold tracking-[.2em] text-cyan-200">WHERE WE ARE</p><h2 className="mt-3 text-2xl font-semibold">Early, and building in public.</h2></div>
          <div className="space-y-3 text-sm leading-6 text-zinc-300">
            <p>You can explore community listings and sign in with Google or X to use account features. Creators can publish free or paid listings; paid sales require the creator to complete the applicable payout setup.</p>
            <p>Creators provide listing content. Review the details before using or purchasing a listing. Some listings may have incomplete content, and moderation is not the same as an independent technical or safety audit.</p>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-violet-300/15 bg-violet-300/[.04] p-6 sm:p-8">
          <p className="text-xs font-bold tracking-[.2em] text-violet-200">A NOTE ON $SSDY</p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">$SSDY is a separate community token on Solana. It is not required to browse or publish on Synthsynd World, and the marketplace does not promise token utility, price performance, or returns. Crypto assets are volatile; verify the address and understand the risks before interacting.</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400"><code className="break-all rounded-lg border border-white/10 bg-black/30 px-3 py-2">CA: {ca}</code><a className="font-semibold text-violet-200 underline decoration-violet-200/40 underline-offset-4 hover:text-white" href={pumpFunUrl} target="_blank" rel="noreferrer">View token on Pump.fun ↗</a></div>
        </section>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-zinc-500">
          <p>Less hype. More building. Useful ideas, made real.</p>
          <div className="flex flex-wrap gap-5"><Link href="/trust" className="hover:text-white">Trust & safety</Link><Link href="/terms" className="hover:text-white">Terms</Link><Link href="/" className="hover:text-white">Synthsynd World home</Link></div>
        </footer>
      </div>
    </main>
  );
}
