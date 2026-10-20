'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import WalletButton from './WalletButton';

export default function Sidebar() {
  const pathname = usePathname();
  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Marketplace', href: '/', icon: '🛒' },
    { name: 'My Items', href: '/profile', icon: '📋' },
    { name: 'Frenzy', href: '/frenzy', icon: '🔥' },
    { name: 'API Keys', href: '/api-keys', icon: '🔑' },
    { name: 'Publish', href: '/create', icon: '🚀' },
  ];

  return (
    <aside className="w-64 border-r border-gray-800 bg-black flex flex-col h-screen fixed left-0 top-0 z-50">
      <div className="p-6">
        <Link href="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Synthsynd World</Link>
      </div>
      <nav className="flex-1 px-4 flex flex-col gap-2">
        {navItems.map((item) => (
          <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${pathname === item.href ? 'bg-purple-600/20 text-purple-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <span>{item.icon}</span>{item.name}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800"><WalletButton /></div>
    </aside>
  );
}