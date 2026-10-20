'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import Link from 'next/link';

export default function DashboardOverview() {
  const { publicKey } = useWallet();
  const [stats, setStats] = useState({ agents: 0, prompts: 0, tools: 0 });

  useEffect(() => {
    async function fetchStats() {
      if (!publicKey) return;
      
      const wallet = publicKey.toBase58();
      
      const { data } = await supabase
        .from('agents')
        .select('statusType')
        .eq('user_id', wallet);

      if (data) {
        const counts = { agents: 0, prompts: 0, tools: 0 };
        data.forEach(item => {
          if (item.statusType === 'agent') counts.agents++;
          else if (item.statusType === 'prompt') counts.prompts++;
          else if (item.statusType === 'tool') counts.tools++;
        });
        setStats(counts);
      }
    }
    fetchStats();
  }, [publicKey]);

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to Synthsynd World</h1>
        <p className="text-gray-400 mb-8">Please connect your wallet to access your dashboard.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard Overview</h1>
      
      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
          <h3 className="text-gray-400 text-sm mb-2">Total Agents</h3>
          <p className="text-4xl font-bold text-white">{stats.agents}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
          <h3 className="text-gray-400 text-sm mb-2">Total Prompts</h3>
          <p className="text-4xl font-bold text-white">{stats.prompts}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
          <h3 className="text-gray-400 text-sm mb-2">Total Tools</h3>
          <p className="text-4xl font-bold text-white">{stats.tools}</p>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
      <div className="flex gap-4">
        <Link href="/create" className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-bold transition">
          Publish New Item
        </Link>
        <Link href="/profile" className="bg-gray-800 hover:bg-gray-700 px-6 py-3 rounded-xl font-bold transition">
          Manage My Items
        </Link>
      </div>
    </div>
  );
}