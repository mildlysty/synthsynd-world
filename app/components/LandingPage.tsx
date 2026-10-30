'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabase';
import BrandLogo, { BrandSymbol } from './BrandLogo';

type Agent = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  category?: string | null;
  price_inr?: number | null;
  is_free?: boolean | null;
  owner_id?: string | null;
  creatorName?: string;
};

function agentUrl(id: string) {
  return `/agent/${encodeURIComponent(id)}`;
}

export default function LandingPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [agentsFailed, setAgentsFailed] = useState(false);
  const [reloadAgents, setReloadAgents] = useState(0);
  const [listingCount, setListingCount] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [copied, setCopied] = useState(false);
  const officialX = process.env.NEXT_PUBLIC_X_URL?.trim() || '';
  const ca = process.env.NEXT_PUBLIC_SSDY_CA?.trim() || '5kkYSNkWgn6DCkTkPRbKKEZtmzVzVWXSR9R9PK5Ppump';
  const pumpFunUrl = process.env.NEXT_PUBLIC_SSDY_PUMPFUN_URL?.trim() || 'https://pump.fun/coin/5kkYSNkWgn6DCkTkPRbKKEZtmzVzVWXSR9R9PK5Ppump';
  const privacyUrl = process.env.NEXT_PUBLIC_PRIVACY_URL?.trim() || '';

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/items?limit=1&type=all', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return;
        const body = await response.json();
        if (typeof body.count === 'number' && Number.isFinite(body.count) && !controller.signal.aborted) {
          setListingCount(body.count);
        }
      })
      .catch(() => {
        // Keep the general community message if the optional count is unavailable.
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    setLoadingAgents(true);
    setAgentsFailed(false);

    async function loadAgents() {
      try {
        const response = await fetch('/api/v1/items?limit=100&type=agent', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load agents');
        const body = await response.json();
        const rows = (Array.isArray(body.items) ? body.items : []).slice(0, 10) as Agent[];
        if (cancelled) return;

        // Render listings immediately; creator profiles are optional enrichment.
        setAgents(rows);
        setLoadingAgents(false);
        window.clearTimeout(timeout);

        const ownerIds = [...new Set(rows.map((agent) => agent.owner_id).filter((id): id is string => Boolean(id)))];
        if (!ownerIds.length) return;
        void Promise.resolve(supabase.from('marketplace_profiles').select('owner_id,username,display_name').in('owner_id', ownerIds)
          .then(({ data }) => {
            if (cancelled || !data) return;
            const names = new Map(data.map((profile) => [profile.owner_id, profile.display_name || (profile.username ? `@${profile.username}` : 'Community creator')]));
            setAgents(rows.map((agent) => ({ ...agent, creatorName: agent.owner_id ? names.get(agent.owner_id) || 'Community creator' : 'Community creator' })));
          })
          ).catch(() => {
            // Creator names are decorative; keep loaded listings visible.
          });
      } catch {
        if (!cancelled) {
          setAgents([]);
          setAgentsFailed(true);
          setLoadingAgents(false);
        }
      }
    }

    void loadAgents();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [reloadAgents]);

  useEffect(() => {
    if (paused || reducedMotion || agents.length < 2) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % agents.length), 6000);
    return () => window.clearInterval(timer);
  }, [agents.length, paused, reducedMotion]);

  const current = useMemo(() => agents[active] ?? null, [agents, active]);
  const move = useCallback((delta: number) => {
    setActive((index) => (index + delta + agents.length) % agents.length);
  }, [agents.length]);

  async function copyAddress() {
    if (!ca) return;
    try {
      await navigator.clipboard.writeText(ca);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const shortenedCa = ca.length > 16 ? `${ca.slice(0, 7)}…${ca.slice(-6)}` : ca;

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link href="/" className="landing-brand" aria-label="Synthsynd World home">
            <BrandLogo />
          </Link>
          <nav className="landing-nav" aria-label="Main navigation">
            <a href="#marketplace">Marketplace</a>
            <a href="#build">Build</a>
            <a href="#agents">Agents</a>
            <Link href="/trust">Trust</Link>
            <Link href="/developers">Docs</Link>
          </nav>
          <div className="landing-actions">
            <Link href="/workflows" className="landing-pad-mobile">Workflows</Link>
            {ca ? (
              <div className="token-actions">
                <button className="token-address" type="button" onClick={copyAddress} title="Copy $SSDY contract address" aria-label={`Copy $SSDY contract address ${ca}`}>
                  <span className="token-live-dot" /><span className="token-ca-label">CA</span><code className="token-ca-full">{copied ? 'Copied' : shortenedCa}</code><code className="token-ca-compact">{copied ? 'Copied' : `${ca.slice(0, 4)}…`}</code>
                </button>
                {pumpFunUrl && <a className="token-buy" href={pumpFunUrl} target="_blank" rel="noreferrer">Buy $SSDY ↗</a>}
              </div>
            ) : (
              <span className="token-soon"><span className="token-live-dot" /> $SSDY <b>CA coming soon</b></span>
            )}
            <Link href="/signin" className="landing-signin">Sign in <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-copy">
            <p className="landing-eyebrow"><span className="eyebrow-line" /> THE AGENT ECONOMY, OPEN</p>
            <h1 id="landing-title">Useful agents.<br /><span>Made by people.</span></h1>
            <p className="landing-subhead">Discover AI agents, tools, prompts, and skills built by the community. Put your best work in front of people who need it.</p>
            <div className="landing-ctas">
              <Link href="/marketplace" className="landing-primary">Explore marketplace <span aria-hidden="true">→</span></Link>
              <Link href="/create" className="landing-secondary">Publish your work <span aria-hidden="true">↗</span></Link>
            </div>
            <p className="landing-microcopy"><span aria-hidden="true">✓</span> Sign in with Google or X. No wallet needed to explore.</p>
            <div className="landing-proof"><span className="proof-pulse" /> {listingCount === null ? 'COMMUNITY BUILT' : `${listingCount.toLocaleString()} PUBLISHED LISTINGS`} <i /> OPEN TO EVERY BUILDER</div>
          </div>

          <div className="agent-showcase" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}>
            <div className="showcase-topline">
              <div><span className="showcase-kicker">THE COMMUNITY IS BUILDING</span><h2>Agent spotlight</h2></div>
              <Link href="/marketplace?type=agent" className="showcase-all">All agents <span aria-hidden="true">↗</span></Link>
            </div>

            {current ? (
              <article className="spotlight-card" aria-live="polite">
                <div className={`spotlight-art ${current.image_url ? 'has-image' : ''}`}>
                  {current.image_url ? <img src={current.image_url} alt={`${current.name} listing artwork`} /> : <div className="art-grid" aria-hidden="true"><span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" /><span className="art-core"><BrandSymbol /></span><span className="art-caption">SYNTHSYND / AGENT</span></div>}
                  <span className="spotlight-count">{String(active + 1).padStart(2, '0')} <i /> {String(agents.length).padStart(2, '0')}</span>
                  <span className="spotlight-category">{current.category || 'AI AGENT'}</span>
                </div>
                <div className="spotlight-info">
                  <div className="spotlight-title-row"><div><p className="spotlight-creator">BY {current.creatorName || 'COMMUNITY CREATOR'}</p><h3>{current.name}</h3></div><span className="spotlight-price">{current.is_free ? 'FREE' : current.price_inr != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(current.price_inr)) : 'INR PRICE NEEDED'}</span></div>
                  <p className="spotlight-description">{current.description || 'Open this agent to see what it can do and how to get started.'}</p>
                  <Link href={agentUrl(current.id)} className="spotlight-link">Explore this agent <span aria-hidden="true">→</span></Link>
                </div>
              </article>
            ) : (
              <div className="spotlight-empty" aria-live="polite" aria-busy={loadingAgents}>
                <div className="empty-art"><BrandSymbol /></div>
                <p className="showcase-kicker">{loadingAgents ? 'LOADING LIVE LISTINGS' : agentsFailed ? 'SPOTLIGHT TEMPORARILY UNAVAILABLE' : 'THE COMMUNITY IS BUILDING'}</p>
                <h3>{loadingAgents ? <>Finding the latest<br />community agents.</> : agentsFailed ? <>The spotlight is<br />taking a break.</> : <>No agents featured<br />just yet.</>}</h3>
                <p>{loadingAgents ? 'Loading published agents from the marketplace…' : agentsFailed ? 'The marketplace is still available while we reconnect the spotlight.' : 'Browse the marketplace to discover community agents.'}</p>
                {!loadingAgents && <div className="spotlight-fallback-actions"><Link href="/marketplace?type=agent" className="spotlight-link">Browse agents <span aria-hidden="true">→</span></Link>{agentsFailed && <button type="button" className="spotlight-link spotlight-retry" onClick={() => setReloadAgents((attempt) => attempt + 1)}>Try again</button>}</div>}
              </div>
            )}

            <div className="showcase-footer">
              <div className="showcase-dots" role="group" aria-label="Choose featured agent">
                {agents.slice(0, 10).map((agent, index) => <button key={agent.id} type="button" aria-label={`Show agent ${index + 1}: ${agent.name}`} aria-current={active === index ? 'true' : undefined} onClick={() => setActive(index)} />)}
                {!agents.length && <span className="empty-dash" />}
              </div>
              {agents.length > 1 && <div className="showcase-controls"><button type="button" aria-label="Previous agent" onClick={() => move(-1)}>←</button><button type="button" aria-label="Next agent" onClick={() => move(1)}>→</button></div>}
              <span className="showcase-note">{agents.length ? `FEATURED AGENT ${String(active + 1).padStart(2, '0')} / ${String(agents.length).padStart(2, '0')}` : 'AGENT SPOTLIGHT'}</span>
            </div>
          </div>
        </section>

        <section className="landing-platform" aria-label="Synthsynd World platform">
          <div className="landing-platform-head" id="marketplace">
            <div><p className="landing-section-kicker">ONE COMMUNITY, MANY BUILDING BLOCKS</p><h2>From a useful idea<br /><span>to something people can use.</span></h2></div>
            <p>Find community-made work, inspect how it fits your needs, and build your own practical workflow. Start with what exists today.</p>
          </div>

          <div className="landing-feature-grid" id="agents">
            <Link href="/marketplace" className="landing-feature-card feature-market">
              <div className="feature-top"><span className="feature-index">01 / DISCOVER</span><span className="feature-arrow">↗</span></div>
              <div className="feature-market-visual" aria-hidden="true">
                <div className="feature-list-row"><i className="mini-mark">A</i><span><b>Research agent</b><small>AGENT · COMMUNITY LISTING</small></span><em>OPEN</em></div>
                <div className="feature-list-row"><i className="mini-mark mini-violet">P</i><span><b>Launch brief prompt</b><small>PROMPT · COMMUNITY LISTING</small></span><em>OPEN</em></div>
                <div className="feature-list-row"><i className="mini-mark mini-cyan">T</i><span><b>Data helper</b><small>TOOL · COMMUNITY LISTING</small></span><em>OPEN</em></div>
              </div>
              <h3>Explore the marketplace</h3><p>Browse agents, prompts, tools, skills, and more from community creators.</p>
            </Link>

            <Link href="/workflows" className="landing-feature-card feature-build" id="build">
              <div className="feature-top"><span className="feature-index">02 / COMPOSE</span><span className="feature-arrow">↗</span></div>
              <div className="feature-flow-visual" aria-hidden="true">
                <div className="flow-node flow-goal"><small>YOUR GOAL</small><b>Prepare a clear brief</b></div><span className="flow-link">···········</span>
                <div className="flow-node"><small>01 / AGENT</small><b>Research</b></div><span className="flow-link">···········</span>
                <div className="flow-node"><small>02 / PROMPT</small><b>Draft</b></div>
                <div className="flow-preview-caption"><span className="flow-live-dot"/> GUIDED WORKFLOW · YOU STAY IN CONTROL</div>
              </div>
              <h3>Build a workflow</h3><p>Arrange real listings into a step-by-step plan you can follow and share.</p>
            </Link>

            <Link href="/create" className="landing-feature-card feature-publish">
              <div className="feature-top"><span className="feature-index">03 / PUBLISH</span><span className="feature-arrow">↗</span></div>
              <div className="feature-publish-visual" aria-hidden="true">
                <div className="publish-window"><div className="publish-window-top"><span/><span/><span/><small>NEW LISTING</small></div><div className="publish-lines"><i/><i/><i/><i/></div><div className="publish-check">✓ <b>Ready for review</b></div></div>
                <span className="publish-orbit publish-orbit-a"/><span className="publish-orbit publish-orbit-b"/>
              </div>
              <h3>Put your work out there</h3><p>Publish an agent, prompt, tool, or skill and manage it from your creator workspace.</p>
            </Link>

            <Link href="/developers" className="landing-feature-card feature-connect">
              <div className="feature-top"><span className="feature-index">04 / CONNECT</span><span className="feature-arrow">↗</span></div>
              <div className="feature-connect-visual" aria-hidden="true">
                <div className="connect-terminal"><span className="terminal-prompt">$</span> discover community tools<br/><span className="terminal-prompt">$</span> choose a resource<br/><span className="terminal-prompt">$</span> connect your app <b>_</b></div>
                <div className="connect-badges"><span>API</span><span>x402</span><span>MCP</span></div>
              </div>
              <h3>Connect through open interfaces</h3><p>Explore developer documentation, API access, MCP, and the x402 resource directory.</p>
            </Link>
          </div>

          <div className="landing-how" aria-label="How Synthsynd World works">
            <div className="landing-how-heading"><p className="landing-section-kicker">BUILT FOR PEOPLE WHO MAKE THINGS</p><h2>Find it. Understand it. Put it to work.</h2></div>
            <div className="landing-how-steps">
              <div><span>01</span><b>Discover</b><p>Search by category and see what each listing is meant to do.</p></div><i aria-hidden="true">→</i>
              <div><span>02</span><b>Inspect</b><p>Review its description, creator, access terms, and attached content.</p></div><i aria-hidden="true">→</i>
              <div><span>03</span><b>Build or publish</b><p>Use the workflow builder or share your own work with the community.</p></div>
            </div>
          </div>

          <div className="landing-creator-band">
            <div className="creator-band-mark"><BrandSymbol /></div>
            <div><p className="landing-section-kicker">FOR THE PEOPLE BUILDING THE NEXT TOOL</p><h2>Your work deserves a useful home.</h2><p>Publish a listing, explain what it does, and help the right people find it. You choose what to share and how to price your work.</p></div>
            <Link href="/create" className="landing-primary">Publish a listing <span aria-hidden="true">→</span></Link>
          </div>

          <div className="landing-disclaimer"><span className="disclaimer-symbol">i</span><p><b>Clear by design.</b> Listings are created by their authors. Read each listing’s details and verify integrations or external links before using them. Synthsynd workflows are guided plans; they do not automatically run agents or send payments.</p><Link href="/trust">Trust & safety ↗</Link></div>
        </section>
      </main>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Synthsynd World</span>
        <span>Agents, tools & ideas—made to move.</span>
        <div><Link href="/manifesto">Manifesto</Link><Link href="/terms">Terms</Link>{privacyUrl ? <a href={privacyUrl}>Privacy</a> : <span title="Add the official privacy policy URL before launch">Privacy policy soon</span>}<Link href="/trust">Trust & safety</Link>{officialX && <a href={officialX} target="_blank" rel="noreferrer">X</a>}</div>
      </footer>
    </div>
  );
}
