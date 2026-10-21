'use client';

import Link from 'next/link';
import { useState } from 'react';
import WalletButton from './WalletButton';

const tokenMint = process.env.NEXT_PUBLIC_SSDY_MINT_ADDRESS?.trim() ?? '';
const tokenBuyUrl = process.env.NEXT_PUBLIC_SSDY_BUY_URL?.trim() ?? '';

const steps = [
  {
    number: '01',
    title: 'Discover what’s possible',
    description: 'Explore community-built AI agents, prompts, tools, skills, and services.',
  },
  {
    number: '02',
    title: 'Build and publish',
    description: 'Share your work with a creator profile and make it available to the community.',
  },
  {
    number: '03',
    title: 'Connect on your terms',
    description: 'Sign in with Google or X, and connect a wallet when a feature needs one.',
  },
];

export default function LandingPage() {
  const [copied, setCopied] = useState(false);

  async function copyMint() {
    if (!tokenMint) return;
    try {
      await navigator.clipboard.writeText(tokenMint);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#07080b] text-white selection:bg-cyan-300 selection:text-black">
      <header className="relative z-10 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-5 px-5 py-4 sm:px-8 lg:px-12">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Synthsynd World home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-violet-500 text-sm font-black text-black">S</span>
            <span className="text-sm font-bold tracking-tight sm:text-base">SYNTHSYND <span className="text-zinc-500">WORLD</span></span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
            <Link className="transition hover:text-white" href="/marketplace">Explore</Link>
            <a className="transition hover:text-white" href="#how-it-works">How it works</a>
            <a className="transition hover:text-white" href="#ssdy">$SSDY</a>
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link href="/create" className="hidden rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-white/30 hover:bg-white/5 sm:inline-flex">Publish</Link>
            <Link href="/signin" className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-cyan-100">Sign in</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate mx-auto grid min-h-[690px] max-w-[1440px] items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:px-12 lg:py-24">
          <div className="pointer-events-none absolute -left-40 top-16 -z-10 h-[420px] w-[420px] rounded-full bg-violet-600/15 blur-[120px]" />
          <div className="pointer-events-none absolute right-0 top-40 -z-10 h-[400px] w-[400px] rounded-full bg-cyan-400/10 blur-[130px]" />
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9]" /> The open AI creator economy
            </div>
            <h1 className="mt-8 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-7xl xl:text-[5.5rem]">
              Build with AI.<br />
              <span className="bg-gradient-to-r from-cyan-200 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">Launch into more.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-400 sm:text-xl">
              One world for agents, tools, prompts, and the people building what comes next. Discover useful work—or publish something of your own.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/marketplace" className="group inline-flex items-center gap-3 rounded-xl bg-cyan-300 px-5 py-3.5 font-bold text-black shadow-[0_10px_40px_-16px_rgba(103,232,249,.8)] transition hover:-translate-y-0.5 hover:bg-cyan-200">
                Explore marketplace <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
              </Link>
              <Link href="/create" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-5 py-3.5 font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.07]">
                <span aria-hidden="true">↗</span> Publish your work
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-500">
              <Link href="/signin" className="hover:text-zinc-200">Google or X sign-in</Link>
              <span aria-hidden="true" className="text-zinc-700">•</span>
              <span>Wallet connection when you need it</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[570px]">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-cyan-400/15 via-violet-500/10 to-fuchsia-500/15 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#101116]/95 p-5 shadow-2xl shadow-black/60 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Synthsynd World</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">Your next idea starts here.</h2>
                </div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">Live</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-4">
                  <span className="text-xl">◈</span><p className="mt-3 font-semibold">AI agents</p><p className="mt-1 text-xs leading-5 text-zinc-500">Discover specialized assistants</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-4">
                  <span className="text-xl">⌘</span><p className="mt-3 font-semibold">Tools & prompts</p><p className="mt-1 text-xs leading-5 text-zinc-500">Find building blocks for work</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-4">
                  <span className="text-xl">↗</span><p className="mt-3 font-semibold">Creator listings</p><p className="mt-1 text-xs leading-5 text-zinc-500">Publish and share your projects</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-4">
                  <span className="text-xl">◎</span><p className="mt-3 font-semibold">Wallet ready</p><p className="mt-1 text-xs leading-5 text-zinc-500">Connect only for wallet features</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-violet-300/15 bg-gradient-to-r from-violet-500/[0.09] to-cyan-300/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-semibold">Already have a wallet?</p><p className="mt-1 text-xs text-zinc-400">Connect when you’re ready to use on-chain features.</p></div>
                <div className="sm:w-44"><WalletButton /></div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-white/[0.08] pt-4 text-xs text-zinc-500">
                <span>Discover · Create · Connect</span><Link href="/marketplace" className="font-semibold text-cyan-200 hover:text-cyan-100">Enter the marketplace →</Link>
              </div>
            </div>
            <div className="absolute -bottom-7 -left-6 hidden rounded-2xl border border-white/10 bg-[#17181e] px-4 py-3 shadow-xl sm:block">
              <p className="text-[10px] uppercase tracking-[.16em] text-zinc-500">Built for</p><p className="mt-1 text-sm font-semibold">Curious minds & creators</p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-white/[0.07] bg-white/[0.018]">
          <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">How it works</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">From finding an idea to sharing your own.</h2>
              <p className="mt-4 leading-7 text-zinc-400">Start exploring right away. Sign in to publish and manage your creator account; connect a wallet when a feature needs it.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {steps.map((step) => (
                <article key={step.number} className="rounded-2xl border border-white/[0.08] bg-[#0d0e12] p-6 sm:p-7">
                  <span className="font-mono text-sm text-cyan-200">{step.number}</span>
                  <h3 className="mt-8 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="ssdy" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <div className="relative overflow-hidden rounded-[1.8rem] border border-violet-300/15 bg-[#101016] p-7 sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-violet-500/15 blur-[100px]" />
            <div className="relative grid gap-10 lg:grid-cols-[1fr_.9fr] lg:items-center">
              <div>
                <span className="inline-flex rounded-full border border-violet-300/20 bg-violet-300/[0.07] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">Future community token</span>
                <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Meet <span className="text-violet-200">$SSDY</span></h2>
                <p className="mt-4 max-w-xl leading-7 text-zinc-400">We’re exploring a Synthsynd World community token for the future. It is not available to buy yet. We’ll publish verified launch details here when it’s ready.</p>
              </div>
              <div className="rounded-2xl border border-white/[0.09] bg-black/40 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Official token address</p>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tokenMint ? 'bg-emerald-300/10 text-emerald-200' : 'bg-amber-300/10 text-amber-200'}`}>{tokenMint ? 'Configured' : 'Coming soon'}</span>
                </div>
                <div className="mt-4 flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-[#090a0d] px-4 py-3">
                  <code className="min-w-0 flex-1 break-all text-xs text-zinc-300 sm:text-sm">{tokenMint || 'Official address will appear after launch'}</code>
                  <button type="button" onClick={copyMint} disabled={!tokenMint} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Copy $SSDY token address">{copied ? 'Copied' : 'Copy'}</button>
                </div>
                {tokenBuyUrl ? (
                  <a href={tokenBuyUrl} target="_blank" rel="noreferrer" className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-violet-300 px-4 py-3 text-sm font-bold text-black transition hover:bg-violet-200">View official $SSDY market ↗</a>
                ) : (
                  <button type="button" disabled className="mt-4 min-h-12 w-full cursor-not-allowed rounded-xl bg-violet-300/15 px-4 py-3 text-sm font-bold text-violet-100/60">Buy $SSDY · Not launched</button>
                )}
                <p className="mt-3 text-xs leading-5 text-zinc-500">The address and market link will be enabled only after the official launch. Verify announcements through Synthsynd World’s official channels.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 pb-20 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-6 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-cyan-300/[0.07] to-violet-400/[0.07] p-7 sm:flex-row sm:items-center sm:p-9">
            <div><h2 className="text-2xl font-semibold">Ready to explore?</h2><p className="mt-2 text-sm text-zinc-400">Find your next tool—or put your own work out into the world.</p></div>
            <div className="flex flex-wrap gap-3"><Link href="/marketplace" className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-black hover:bg-zinc-200">Explore marketplace</Link><Link href="/signin" className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold hover:bg-white/[0.06]">Sign in with Google or X</Link></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-7 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <span>© {new Date().getFullYear()} Synthsynd World</span>
          <div className="flex gap-5"><Link href="/marketplace" className="hover:text-white">Marketplace</Link><Link href="/developers" className="hover:text-white">Developers</Link><Link href="/signin" className="hover:text-white">Account</Link></div>
        </div>
      </footer>
    </div>
  );
}
