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
  price_usd?: number | null;
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
            <Link href="/marketplace">Explore</Link>
            <Link href="/manifesto">Manifesto</Link>
            <Link href="/developers">Docs</Link>
            <Link href="/terms">Terms</Link>
          </nav>
          <div className="landing-actions">
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
                  <div className="spotlight-title-row"><div><p className="spotlight-creator">BY {current.creatorName || 'COMMUNITY CREATOR'}</p><h3>{current.name}</h3></div><span className="spotlight-price">{current.is_free ? 'FREE' : Number(current.price_usd) > 0 ? `$${Number(current.price_usd).toFixed(2)}` : 'VIEW'}</span></div>
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
      </main>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Synthsynd World</span>
        <span>Agents, tools & ideas—made to move.</span>
        <div><Link href="/manifesto">Manifesto</Link><Link href="/terms">Terms</Link>{privacyUrl ? <a href={privacyUrl}>Privacy</a> : <span title="Add the official privacy policy URL before launch">Privacy policy soon</span>}<Link href="/trust">Trust & safety</Link>{officialX && <a href={officialX} target="_blank" rel="noreferrer">X</a>}</div>
      </footer>
    </div>
  );
}
