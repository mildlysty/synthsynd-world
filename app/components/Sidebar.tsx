'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import WalletButton from './WalletButton';
import { supabase } from '../../utils/supabase';

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Marketplace', href: '/', icon: '🛒' },
    { name: 'Agent Registry', href: '/platform/registry', icon: '🔎' },
    { name: 'Bookmarks', href: '/bookmarks', icon: '🔖' },
    { name: 'Sign in / Account', href: '/signin', icon: '👤' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
    { name: 'Creator Payouts', href: '/payouts', icon: '💳' },
    { name: 'Pricing', href: '/pricing', icon: '💎' },
    { name: 'API Credits', href: '/credits', icon: '🪙' },
    { name: 'My Items', href: '/profile', icon: '📋' },
    { name: 'Frenzy', href: '/frenzy', icon: '🔥' },
    { name: 'Agent Economy', href: '/agent-economy', icon: '🪙' },
    { name: 'Token Pricing', href: '/tokenization-pricing', icon: '💸' },
    { name: 'Screener', href: '/screener', icon: '📈' },
    { name: 'Leaderboard', href: '/leaderboard', icon: '🏆' },
    { name: 'Competitions', href: '/competitions', icon: '🎯' },
    { name: 'MCP Servers', href: '/mcp-servers', icon: '🔌' },
    { name: 'x402 Bazaar', href: '/x402-bazaar', icon: '⚡' },
    { name: 'API Keys', href: '/api-keys', icon: '🔑' },
    { name: 'API Usage', href: '/platform/usage', icon: '📊' },
    { name: 'Developers', href: '/developers', icon: '⌘' },
    { name: 'Publish', href: '/create', icon: '🚀' },
    { name: 'Bulk Publish', href: '/bulk-publish', icon: '📦' },
  ];

  useEffect(() => {
    let active = true;
    async function checkAdmin(accessToken: string | null) {
      if (!accessToken) { if (active) setIsAdmin(false); return; }
      try {
        const response = await fetch('/api/admin/access', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
        const body = await response.json();
        if (active) setIsAdmin(response.ok && body.isAdmin === true);
      } catch { if (active) setIsAdmin(false); }
    }
    supabase.auth.getSession().then(({ data }) => checkAdmin(data.session?.access_token ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => checkAdmin(session?.access_token ?? null));
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  if (isAdmin) navItems.push({ name: 'Admin moderation', href: '/admin/moderation', icon: '🛡️' });

  const nav = (mobile = false) => navItems.map((item) => (
    <Link key={item.name} href={item.href} onClick={() => mobile && setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition ${pathname === item.href ? 'bg-purple-600/20 text-purple-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
      <span>{item.icon}</span>{item.name}
    </Link>
  ));

  return (
    <>
    <div className="sticky top-0 z-50 border-b border-gray-800 bg-black lg:hidden">
      <div className="flex items-center justify-between p-4">
        <Link href="/" className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Synthsynd World</Link>
        <button type="button" aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)} className="rounded-lg border border-gray-700 px-3 py-2 text-sm">{mobileOpen ? 'Close' : 'Menu'}</button>
      </div>
      {mobileOpen && <nav className="grid max-h-[70vh] gap-1 overflow-y-auto border-t border-gray-800 p-3">{nav(true)}<div className="p-2"><WalletButton /></div></nav>}
    </div>
    <aside className="fixed left-0 top-0 z-40 hidden h-dvh w-64 flex-col border-r border-gray-800 bg-black lg:flex">
      <div className="p-6">
        <Link href="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Synthsynd World</Link>
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto px-4">{nav()}</nav>
      <div className="p-4 border-t border-gray-800"><WalletButton /></div>
    </aside>
    </>
  );
}
