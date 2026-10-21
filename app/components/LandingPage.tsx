'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabase';

type Listing = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price_usd?: number | null;
  is_free?: boolean | null;
  statusType?: string | null;
  category?: string | null;
  created_at?: string | null;
  owner_id?: string | null;
  user_id?: string | null;
  creatorName?: string;
  creatorHandle?: string;
  creatorAvatar?: string | null;
};

type ListingType = 'all' | 'agent' | 'tool' | 'prompt' | 'skill' | 'mcp';
const categoryFilters: Array<{ label: string; value: ListingType }> = [
  { label: 'All', value: 'all' },
  { label: 'Agents', value: 'agent' },
  { label: 'Tools', value: 'tool' },
  { label: 'Prompts', value: 'prompt' },
  { label: 'Skills', value: 'skill' },
  { label: 'Services', value: 'mcp' },
];

const examples: Listing[] = [
  { id: 'example-research', name: 'Research Brief Builder', statusType: 'agent', category: 'Research', description: 'Turn a topic and a few sources into a structured, cited research brief.', is_free: true, creatorName: 'Example creator' },
  { id: 'example-support', name: 'Support Reply Assistant', statusType: 'agent', category: 'Customer support', description: 'Draft clear support replies from a ticket, policy, and desired tone.', price_usd: 4, creatorName: 'Example creator' },
  { id: 'example-sql', name: 'SQL Query Companion', statusType: 'tool', category: 'Developer', description: 'Explain a schema and generate a readable query for a specific question.', price_usd: 3, creatorName: 'Example creator' },
  { id: 'example-launch-copy', name: 'Product Launch Copy Kit', statusType: 'prompt', category: 'Marketing', description: 'Create a concise launch plan, landing-page draft, and announcement variants.', is_free: true, creatorName: 'Example creator' },
  { id: 'example-review', name: 'Code Review Checklist', statusType: 'skill', category: 'Developer', description: 'Review a pull request for correctness, security, and maintainability.', price_usd: 2, creatorName: 'Example creator' },
  { id: 'example-market-pulse', name: 'Market Pulse Service', statusType: 'mcp', category: 'Data', description: 'Give an agent a focused set of market data tools through an MCP endpoint.', price_usd: 8, creatorName: 'Example creator' },
];

const faqs = [
  { q: 'Do I need a wallet?', a: 'No. Browse the marketplace and sign in with Google or X without a wallet. Connect a wallet only for features that specifically need an on-chain action.' },
  { q: 'How do creators get paid?', a: 'Paid listing checkout uses Stripe Connect. Creators set their listing price and complete Stripe onboarding; Stripe controls payout timing based on account and country.' },
  { q: 'What does it cost to publish?', a: 'Free listings can be published at no charge. Creators can also set a price for eligible listings. The current default marketplace application fee is 10%, configurable by the platform.' },
  { q: 'How are listings reviewed?', a: 'Listings are submitted by creators and may be reviewed or removed by moderators. A listing being visible is not a guarantee that its code, service, or claims have been independently audited.' },
  { q: 'Is $SSDY live?', a: 'No. $SSDY has not launched and no token is for sale. Treat any claim or address saying otherwise as unofficial.' },
  { q: 'Who runs Synthsynd World?', a: 'Synthsynd World is an independent marketplace project. Creator profiles identify their own listings; the platform does not claim to verify every creator or third-party service.' },
  { q: 'Can I try a listing before paying?', a: 'That depends on the creator’s listing. Check its description and price before checkout; free listings are marked Free.' },
  { q: 'Where can I get help?', a: 'Use the project’s official contact channel once it is published in the footer. For a purchase or service, include the listing link and relevant transaction or order details.' },
];

function typeLabel(type?: string | null) {
  const value = (type || 'agent').toLowerCase();
  return value === 'mcp' ? 'Service' : value.charAt(0).toUpperCase() + value.slice(1);
}

function listingHref(item: Listing) {
  const type = (item.statusType || 'agent').toLowerCase();
  if (type === 'prompt' || type === 'tool' || type === 'mcp' || type === 'skill' || type === 'bundle') return `/${type}/${item.id}`;
  return `/agent/${item.id}`;
}

function priceLabel(item: Listing) {
  if (item.is_free === true) return 'Free';
  const price = Number(item.price_usd);
  return Number.isFinite(price) && price > 0 ? `$${price.toFixed(2)}` : 'See listing';
}

export default function LandingPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState<ListingType>('all');
  const [listingsState, setListingsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const officialX = process.env.NEXT_PUBLIC_X_URL?.trim() ?? '';
  const discordUrl = process.env.NEXT_PUBLIC_DISCORD_URL?.trim() ?? '';
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL?.trim() ?? '';
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() ?? '';
  const termsUrl = process.env.NEXT_PUBLIC_TERMS_URL?.trim() ?? '';
  const privacyUrl = process.env.NEXT_PUBLIC_PRIVACY_URL?.trim() ?? '';
  const teamName = process.env.NEXT_PUBLIC_TEAM_NAME?.trim() || 'Synthsynd World team';

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/v1/items?limit=24&type=all', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Could not fetch current listings.');
        const body = await response.json();
        const rows = (Array.isArray(body.items) ? body.items : []) as Listing[];
        const ownerIds = [...new Set(rows.map((item) => item.owner_id).filter((id): id is string => Boolean(id)))];
        let profileByOwner = new Map<string, { username: string; display_name: string; avatar_url: string | null }>();
        if (ownerIds.length) {
          const { data } = await supabase.from('marketplace_profiles').select('owner_id,username,display_name,avatar_url').in('owner_id', ownerIds);
          profileByOwner = new Map((data ?? []).map((profile) => [profile.owner_id, profile]));
        }
        if (controller.signal.aborted) return;
        setListings(rows.map((item) => {
          const profile = item.owner_id ? profileByOwner.get(item.owner_id) : null;
          return {
            ...item,
            creatorName: profile?.display_name || (profile?.username ? `@${profile.username}` : 'Community creator'),
            creatorHandle: profile?.username ? `@${profile.username}` : '',
            creatorAvatar: profile?.avatar_url || null,
          };
        }));
        setListingsState('ready');
      } catch (error) {
        if (!controller.signal.aborted) setListingsState('error');
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12 });
    document.querySelectorAll('.landing-reveal').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const visibleListings = useMemo(() => {
    const source = [...listings, ...examples];
    const filtered = filter === 'all' ? source : source.filter((item) => (item.statusType || '').toLowerCase() === filter);
    return filtered.slice(0, 6);
  }, [filter, listings]);

  const latestNames = listings.slice(0, 3).map((item) => item.name);

  return (
    <div className="min-h-screen bg-[#08090c] text-zinc-100 selection:bg-cyan-300 selection:text-black">
      <a href="#main" className="sr-only z-[100] rounded-lg bg-white p-3 text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#08090c]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" aria-label="Synthsynd World home">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-300 text-sm font-black text-[#08090c]">S</span>
            <span className="text-sm font-bold tracking-tight sm:text-base">Synthsynd <span className="text-zinc-400">World</span></span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-6 text-sm text-zinc-300 lg:flex">
            <Link className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 hover:text-white" href="/marketplace">Explore</Link>
            <a className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 hover:text-white" href="#how-it-works">How it works</a>
            <a className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 hover:text-white" href="#creators">For creators</a>
            <Link className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 hover:text-white" href="/developers">Docs</Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/create" className="hidden rounded-lg border border-white/20 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 sm:inline-flex">Publish</Link>
            <Link href="/signin" className="rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-black hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">Sign in</Link>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="mx-auto grid max-w-[1280px] items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:py-24">
          <div className="lg:col-span-6">
            <p className="text-sm font-semibold tracking-wide text-cyan-200">A marketplace for useful AI work</p>
            <h1 className="mt-5 max-w-3xl text-[clamp(2.75rem,6.2vw,5rem)] font-semibold leading-[1.02] tracking-[-0.055em]">Find AI agents. Sell what you build.</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">Discover agents, tools, prompts, and skills shared by creators. Publish your own listing, choose whether it’s free or paid, and use Stripe Connect for marketplace checkout.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/marketplace" className="rounded-lg bg-cyan-300 px-5 py-3.5 text-sm font-bold text-[#08090c] hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">Explore marketplace</Link>
              <Link href="/create" className="rounded-lg border border-white/25 px-5 py-3.5 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Publish your work</Link>
            </div>
            <p className="mt-4 text-sm text-zinc-400">Sign in with Google or X. No wallet needed.</p>
          </div>

          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#101217] shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div><p className="text-sm font-semibold uppercase tracking-[.14em] text-zinc-400">Marketplace preview</p><p className="mt-1 text-sm font-semibold">Pick a building block</p></div>
                <Link href="/marketplace" aria-label="Explore all marketplace listings" className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">Explore →</Link>
              </div>
              <div className="space-y-3 p-4 sm:p-5">
                {[
                  { title: 'Research Brief Builder', tag: 'AGENT', text: 'Sources in. Clear, cited brief out.', mark: 'RB', color: 'text-cyan-200' },
                  { title: 'SQL Query Companion', tag: 'TOOL', text: 'Turn a question into a query you can inspect.', mark: 'SQL', color: 'text-violet-200' },
                  { title: 'Product Launch Copy Kit', tag: 'PROMPT', text: 'Draft a launch page and announcement in one flow.', mark: '→', color: 'text-fuchsia-200' },
                ].map((card, index) => (
                  <div key={card.title} className={`flex items-center gap-4 rounded-xl border border-white/[0.09] bg-[#090a0d] p-3.5 sm:p-4 ${index === 1 ? 'translate-x-0 sm:translate-x-3' : ''}`}>
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] font-mono text-sm font-bold ${card.color}`}>{card.mark}</div>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-zinc-100">{card.title}</h2><span className="rounded border border-white/10 px-1.5 py-0.5 text-sm text-zinc-400">{card.tag}</span></div><p className="mt-1 text-sm leading-5 text-zinc-400">{card.text}</p></div>
                    <span className="hidden text-sm text-emerald-200 sm:block">Free or paid</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-white/[0.08] pt-4 text-sm text-zinc-400"><span>Agents · tools · prompts · skills</span><span className="font-mono text-zinc-500">SSW / MARKET</span></div>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Recent marketplace listings" className="landing-reveal border-y border-white/10 bg-[#0c0d11]">
          <div className="mx-auto grid max-w-[1280px] gap-3 px-4 py-5 sm:grid-cols-[160px_1fr] sm:items-center sm:px-6 lg:px-8">
            <span className="text-sm font-semibold uppercase tracking-[.16em] text-zinc-400">Recently added</span>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-200">
              {latestNames.length ? latestNames.map((name) => <span key={name}>{name}</span>) : <span className="text-zinc-400">Be among the first creators to publish a listing.</span>}
            </div>
          </div>
        </section>

        <section id="featured" className="landing-reveal mx-auto max-w-[1280px] scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="text-sm font-semibold text-cyan-200">Browse the work</p><h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Featured listings</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Recent community listings are shown first. Example cards are clearly marked when the marketplace has fewer items.</p></div>
            <Link href="/marketplace" className="text-sm font-semibold text-cyan-200 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">View all listings →</Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter featured listings">
            {categoryFilters.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={`rounded-full border px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${filter === item.value ? 'border-cyan-200 bg-cyan-200 text-[#08090c]' : 'border-white/15 bg-transparent text-zinc-300 hover:bg-white/[0.06]'}`}>{item.label}</button>)}
          </div>
          {listingsState === 'loading' && <p className="mt-8 text-sm text-zinc-400" aria-live="polite">Loading latest listings…</p>}
          {listingsState === 'error' && <p className="mt-8 rounded-xl border border-amber-200/20 bg-amber-200/[0.05] p-4 text-sm text-amber-100">Live listings couldn’t load right now. Browse the marketplace to try again.</p>}
          {listingsState !== 'loading' && <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleListings.map((item) => {
              const isExample = item.id.startsWith('example-');
              const titleInitial = (item.creatorName || 'C').trim().charAt(0).toUpperCase();
              return (
                <article key={item.id} className="group flex min-h-[270px] flex-col rounded-2xl border border-white/10 bg-[#0e0f13] p-5 transition duration-200 hover:-translate-y-1 hover:border-cyan-100/35 focus-within:border-cyan-100/40">
                  <div className="flex items-start justify-between gap-3"><span className="rounded-md border border-white/10 bg-black/30 px-2.5 py-1 text-sm text-zinc-300">{typeLabel(item.statusType)}</span><span className="text-sm font-semibold text-emerald-200">{priceLabel(item)}</span></div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{item.name}</h3>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-zinc-400">{item.description || 'Open this listing to see what it offers.'}</p>
                  {isExample && <span className="mt-3 w-fit rounded border border-amber-200/20 bg-amber-200/[0.05] px-2 py-1 text-sm text-amber-100">Example · not for sale</span>}
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {item.creatorAvatar ? <img src={item.creatorAvatar} alt={`${item.creatorName} avatar`} className="h-8 w-8 rounded-full object-cover" loading="lazy" /> : <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-bold text-zinc-200">{titleInitial}</span>}
                      <span className="truncate text-sm text-zinc-300">{item.creatorName || 'Community creator'}</span>
                    </div>
                    <Link href={isExample ? '/marketplace' : listingHref(item)} className="rounded-md px-2 py-1 text-sm font-semibold text-cyan-200 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">View <span aria-hidden="true">↗</span></Link>
                  </div>
                </article>
              );
            })}
            {!visibleListings.length && <p className="col-span-full rounded-xl border border-white/10 p-8 text-center text-sm text-zinc-400">No listings in this category yet. <Link href="/create" className="text-cyan-200 underline underline-offset-4">Publish the first one.</Link></p>}
          </div>}
        </section>

        <section id="how-it-works" className="landing-reveal scroll-mt-20 border-y border-white/10 bg-[#0c0d11]">
          <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <p className="text-sm font-semibold text-cyan-200">A straightforward path</p><h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
            <div className="mt-9 grid gap-4 lg:grid-cols-3">
              {[
                { n: '01', title: 'Discover', body: 'Filter real listings by type and price. Open a listing to review what it does before you use or buy it.', ui: <><div className="h-2 w-16 rounded bg-cyan-200/80"/><div className="mt-3 h-2 w-full rounded bg-white/10"/><div className="mt-2 h-2 w-3/4 rounded bg-white/10"/><div className="mt-4 flex gap-2"><span className="rounded border border-white/10 px-2 py-1 text-sm">Agent</span><span className="rounded border border-white/10 px-2 py-1 text-sm">Free</span></div></> },
                { n: '02', title: 'Publish', body: 'Sign in, add a description and content, choose a type, and set a free or paid price.', ui: <><div className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded bg-violet-300/15 text-violet-100">✓</span><span className="text-sm">Listing details</span></div><div className="mt-3 h-8 rounded border border-white/10 bg-black/40"/><div className="mt-2 h-8 rounded border border-white/10 bg-black/40"/><div className="mt-3 flex justify-end"><span className="rounded bg-cyan-200 px-3 py-1.5 text-sm font-bold text-black">Publish</span></div></> },
                { n: '03', title: 'Get paid', body: 'For paid listings, connect Stripe and complete seller onboarding. Stripe processes checkout and sets payout timing.', ui: <><div className="text-sm uppercase tracking-wider text-zinc-400">Example checkout</div><div className="mt-3 flex items-center justify-between text-sm"><span>Listing price</span><span>$10.00</span></div><div className="mt-2 flex items-center justify-between text-sm"><span>Platform fee*</span><span>10% default</span></div><div className="mt-3 h-px bg-white/10"/><div className="mt-3 flex justify-between text-sm font-semibold"><span>Stripe Connect</span><span className="text-emerald-200">Connected separately</span></div></> },
              ].map((step) => <article key={step.n} className="rounded-2xl border border-white/10 bg-[#101217] p-5 sm:p-6"><span className="font-mono text-sm text-cyan-200">STEP {step.n}</span><h3 className="mt-3 text-xl font-semibold">{step.title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-zinc-400">{step.body}</p><div className="mt-5 min-h-[116px] rounded-xl border border-white/[0.08] bg-[#090a0d] p-4 text-zinc-300">{step.ui}</div></article>)}
            </div>
            <p className="mt-4 text-sm text-zinc-500">*The marketplace fee is configurable by the platform; the current default is 10%. Stripe payout schedules vary by account and country.</p>
          </div>
        </section>

        <section id="creators" className="landing-reveal mx-auto grid max-w-[1280px] scroll-mt-24 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-20">
          <div className="lg:col-span-6"><p className="text-sm font-semibold text-violet-200">For creators</p><h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Publish once. Let people find your work.</h2><p className="mt-4 max-w-xl leading-7 text-zinc-300">Create a listing for an agent, tool, prompt, skill, or service. Choose a free listing or set your own price for eligible work. Paid checkout uses Stripe Connect, with the platform’s configured fee shown in the product terms.</p>
            <dl className="mt-7 space-y-4 text-sm"><div><dt className="font-semibold text-white">Your pricing</dt><dd className="mt-1 text-zinc-400">Choose free or set a price for each eligible listing.</dd></div><div><dt className="font-semibold text-white">Current default fee</dt><dd className="mt-1 text-zinc-400">10% marketplace application fee, configurable by the platform.</dd></div><div><dt className="font-semibold text-white">Payout timing</dt><dd className="mt-1 text-zinc-400">Stripe sets payout timing based on seller account and country; this page does not promise a fixed schedule.</dd></div></dl>
            <Link href="/create" className="mt-8 inline-flex rounded-lg bg-white px-5 py-3.5 text-sm font-bold text-black hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Publish a listing</Link>
          </div>
          <div className="lg:col-span-6"><div className="rounded-2xl border border-white/10 bg-[#101217] p-5 sm:p-7"><div className="flex items-center justify-between"><h3 className="font-semibold">Publish in 5 steps</h3><span className="rounded-full border border-white/10 px-2.5 py-1 text-sm text-zinc-400">Flow preview</span></div><ol className="mt-6 space-y-3">{['Sign in with Google or X', 'Choose listing type', 'Add title, description, and content', 'Choose Free or set your price', 'Publish and review your listing'].map((label, i) => <li key={label} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-black/30 p-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-300/10 font-mono text-sm text-violet-100">{i + 1}</span><span className="text-sm text-zinc-200">{label}</span><span className="ml-auto text-sm text-emerald-200">{i === 0 ? 'Required' : 'Next'}</span></li>)}</ol><p className="mt-4 text-sm leading-5 text-zinc-500">Illustrative flow. Stripe Connect onboarding is required before receiving paid marketplace payouts.</p></div></div>
        </section>

        <section id="trust" className="landing-reveal border-y border-white/10 bg-[#0c0d11]">
          <div className="mx-auto grid max-w-[1280px] gap-7 px-4 py-14 sm:px-6 lg:grid-cols-[.65fr_1.35fr] lg:items-center lg:px-8">
            <div><p className="text-sm font-semibold text-cyan-200">Trust & safety</p><h2 className="mt-2 text-2xl font-semibold">Know what’s reviewed—and what isn’t.</h2></div>
            <div><p className="text-sm leading-6 text-zinc-300">Listings are creator-submitted and may be moderated. Sign-in confirms access to an account; it does not certify a creator or their code. Review a listing’s details and payment terms before using it. Third-party services control their own availability and responses.</p><Link href="/trust" className="mt-4 inline-flex rounded text-sm font-semibold text-cyan-200 underline decoration-cyan-200/40 underline-offset-4 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">Read trust and safety notes →</Link></div>
          </div>
        </section>

        <section id="ssdy" className="landing-reveal mx-auto max-w-[1280px] scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0d0e12] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><p className="text-sm font-semibold uppercase tracking-[.14em] text-zinc-400">Community token</p><h2 className="mt-1 text-lg font-semibold">$SSDY is not launched. No token is for sale.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">There is no defined token utility or official market yet. Official announcements will be linked here{officialX ? <> and on <a href={officialX} target="_blank" rel="noreferrer" className="text-zinc-200 underline underline-offset-4">the official X account</a></> : ' after the official X account is added'}.</p></div><span className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-400">Not available</span></div>
          <p className="mt-3 text-sm leading-5 text-zinc-400">Digital assets involve risk and can lose all value. Nothing here is an offer, investment advice, or promise of a future token.</p>
        </section>

        <section id="faq" className="landing-reveal border-y border-white/10 bg-[#0c0d11]">
          <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6 lg:py-20">
            <p className="text-sm font-semibold text-cyan-200">Questions, answered</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Frequently asked questions</h2>
            <div className="mt-7 divide-y divide-white/10 border-y border-white/10">{faqs.map((faq) => <details key={faq.q} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded text-base font-semibold text-white marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><span>{faq.q}</span><span aria-hidden="true" className="text-cyan-200 transition-transform group-open:rotate-45">＋</span></summary><p className="max-w-3xl pt-3 text-sm leading-6 text-zinc-300">{faq.a}</p></details>)}</div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20"><p className="text-sm font-semibold text-cyan-200">Start with a listing</p><h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Find the tool you need—or publish the one you made.</h2><Link href="/marketplace" className="mt-7 inline-flex rounded-lg bg-cyan-300 px-6 py-3.5 text-sm font-bold text-[#08090c] hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">Explore marketplace</Link></section>
      </main>

      <footer id="about" className="border-t border-white/10 bg-[#07080a]">
        <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-9 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
          <div><Link href="/" className="font-semibold text-white">Synthsynd World</Link><p className="mt-3 max-w-sm text-sm leading-6 text-zinc-400">An independent marketplace for AI agents, tools, prompts, skills, and services.</p><p className="mt-4 text-sm text-zinc-400">Built by <span className="text-zinc-200">{teamName}</span></p></div>
          <div><h2 className="text-sm font-semibold uppercase tracking-[.14em] text-zinc-400">Explore</h2><ul className="mt-4 space-y-3 text-sm text-zinc-300"><li><Link className="hover:text-white" href="/marketplace">Marketplace</Link></li><li><Link className="hover:text-white" href="/developers">Developers / Docs</Link></li><li><Link className="hover:text-white" href="/trust">Trust & safety</Link></li><li><Link className="hover:text-white" href="/pricing">Pricing</Link></li></ul></div>
          <div><h2 className="text-sm font-semibold uppercase tracking-[.14em] text-zinc-400">About & contact</h2><ul className="mt-4 space-y-3 text-sm text-zinc-300"><li><a className="hover:text-white" href="#about">About</a></li>{termsUrl ? <li><a className="hover:text-white" href={termsUrl}>Terms</a></li> : <li className="text-zinc-500">Terms · add official URL</li>}{privacyUrl ? <li><a className="hover:text-white" href={privacyUrl}>Privacy</a></li> : <li className="text-zinc-500">Privacy · add official URL</li>}{contactEmail ? <li><a className="hover:text-white" href={`mailto:${contactEmail}`}>Contact</a></li> : <li className="text-zinc-500">Contact · add official email</li>}{officialX && <li><a className="hover:text-white" href={officialX} target="_blank" rel="noreferrer">X</a></li>}{discordUrl && <li><a className="hover:text-white" href={discordUrl} target="_blank" rel="noreferrer">Discord</a></li>}{githubUrl && <li><a className="hover:text-white" href={githubUrl} target="_blank" rel="noreferrer">GitHub</a></li>}</ul></div>
        </div>
        <div className="border-t border-white/[0.07]"><div className="mx-auto max-w-[1280px] px-4 py-4 text-sm text-zinc-500 sm:px-6 lg:px-8">© {new Date().getFullYear()} Synthsynd World</div></div>
      </footer>
    </div>
  );
}
