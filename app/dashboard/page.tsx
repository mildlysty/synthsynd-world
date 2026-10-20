'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';

export default function Dashboard() {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [counts, setCounts] = useState({ agent: 0, prompt: 0, tool: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setOwnerId(data.session?.user.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setOwnerId(session?.user.id ?? null));
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

  if (!ownerId) return <div className="p-10 text-center"><p>Sign in to view your dashboard.</p><Link href="/signin" className="mt-4 inline-block rounded-lg bg-purple-600 px-4 py-2 font-semibold">Sign in</Link></div>;

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      {loadError && <p role="alert" className="mb-5 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">Could not load your item counts: {loadError}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800"><h3 className="text-gray-400">Agents</h3><p className="text-4xl font-bold">{loading ? '—' : counts.agent}</p></div>
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800"><h3 className="text-gray-400">Prompts</h3><p className="text-4xl font-bold">{loading ? '—' : counts.prompt}</p></div>
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800"><h3 className="text-gray-400">Tools</h3><p className="text-4xl font-bold">{loading ? '—' : counts.tool}</p></div>
      </div>
      <div className="mt-10 flex gap-4">
        <Link href="/create" className="bg-purple-600 px-6 py-3 rounded-xl font-bold">Publish Item</Link>
        <Link href="/profile" className="bg-gray-800 px-6 py-3 rounded-xl font-bold">Manage Items</Link>
        <Link href="/settings" className="bg-gray-800 px-6 py-3 rounded-xl font-bold">Account Settings</Link>
      </div>
    </div>
  );
}
