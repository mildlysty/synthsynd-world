'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';

export default function Dashboard() {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [counts, setCounts] = useState({ agent: 0, prompt: 0, tool: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setOwnerId(data.session?.user.id ?? null);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setOwnerId(session?.user.id ?? null);
      setAuthLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    async function loadCounts() {
      if (!ownerId) {
        setCounts({ agent: 0, prompt: 0, tool: 0 });
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('agents')
        .select('statusType')
        .eq('owner_id', ownerId);
      if (!active) return;
      if (error) {
        setLoadError(error.message);
      } else {
        setLoadError('');
        setCounts((data || []).reduce<{ agent: number; prompt: number; tool: number }>((current, row) => {
          switch (row.statusType) {
            case 'agent': current.agent += 1; break;
            case 'prompt': current.prompt += 1; break;
            case 'tool': current.tool += 1; break;
          }
          return current;
        }, { agent: 0, prompt: 0, tool: 0 }));
      }
      setLoading(false);
    }
    loadCounts();
    return () => { active = false; };
  }, [ownerId]);

  if (authLoading) return <div className="p-8 text-sm text-gray-400" aria-live="polite">Loading your dashboard…</div>;
  if (!ownerId) return <div className="grid min-h-[70vh] place-items-center p-6 text-center"><div><p className="text-2xl font-bold">Your workspace starts here.</p><p className="mt-3 text-gray-400">Sign in to publish, manage your listings, and use creator tools.</p><Link href="/signin" className="mt-5 inline-block rounded-lg bg-purple-600 px-5 py-3 font-semibold">Sign in</Link></div></div>;

  return (
    <div className="mx-auto max-w-7xl p-5 sm:p-8 lg:p-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-[.16em] text-cyan-300">Synthsynd World</p><h1 className="mt-2 text-3xl font-bold">Your workspace</h1><p className="mt-2 text-sm text-gray-400">Manage your work, discover agents, and keep track of your creator account.</p></div>
        <Link href="/create" className="rounded-lg bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-500">Publish a listing</Link>
      </div>
      {loadError && <p role="alert" className="mb-5 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">Could not load your item counts: {loadError}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800"><h3 className="text-gray-400">Agents</h3><p className="text-4xl font-bold">{loading ? '—' : counts.agent}</p></div>
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800"><h3 className="text-gray-400">Prompts</h3><p className="text-4xl font-bold">{loading ? '—' : counts.prompt}</p></div>
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800"><h3 className="text-gray-400">Tools</h3><p className="text-4xl font-bold">{loading ? '—' : counts.tool}</p></div>
      </div>
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Your tools</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { title: 'Explore marketplace', text: 'Find agents, tools, prompts, and skills.', href: '/marketplace', mark: '↗' },
            { title: 'My listings', text: 'Edit and manage your published work.', href: '/profile', mark: '▤' },
            { title: 'Bookmarks', text: 'Return to listings you saved.', href: '/bookmarks', mark: '◇' },
            { title: 'API keys', text: 'Create and manage access credentials.', href: '/api-keys', mark: '⌘' },
            { title: 'API usage', text: 'Review usage and available credits.', href: '/platform/usage', mark: '▥' },
            { title: 'Creator payouts', text: 'Manage your seller onboarding and payouts.', href: '/payouts', mark: '$' },
            { title: 'Competitions', text: 'View current creator competitions.', href: '/competitions', mark: '✳' },
            { title: 'Developer docs', text: 'Integrate with Synthsynd World APIs.', href: '/developers', mark: '</>' },
            { title: 'Account settings', text: 'Update your profile and preferences.', href: '/settings', mark: '⚙' },
          ].map((feature) => <Link key={feature.href} href={feature.href} className="group rounded-xl border border-gray-800 bg-gray-950 p-5 transition hover:-translate-y-0.5 hover:border-purple-500/50 hover:bg-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><span className="grid h-9 w-9 place-items-center rounded-lg bg-purple-500/10 font-mono text-sm font-bold text-purple-200">{feature.mark}</span><h3 className="mt-4 font-semibold text-white">{feature.title}<span className="ml-2 text-purple-300 opacity-0 transition group-hover:opacity-100">→</span></h3><p className="mt-1 text-sm leading-6 text-gray-400">{feature.text}</p></Link>)}
        </div>
      </section>
      <div className="mt-10 flex flex-wrap gap-3 border-t border-gray-800 pt-6">
        <Link href="/create" className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold hover:bg-gray-700">Create another listing</Link>
        <button type="button" onClick={() => { void supabase.auth.signOut(); }} className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold hover:bg-gray-700">Sign out</button>
      </div>
    </div>
  );
}
