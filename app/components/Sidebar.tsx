'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import WalletButton from './WalletButton';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Marketplace', href: '/', icon: '🛒' },
    { name: 'Registry', href: '/profile', icon: '📋' },
    { name: 'API Keys', href: '/api-keys', icon: '🔑' },
    { name: 'Publish', href: '/create', icon: '🚀' },
  ];

  return (
    <aside className="w-64 border-r border-gray-800 bg-black flex flex-col h-screen fixed left-0 top-0 z-50">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center font-bold text-white">S</div>
          <span className="text-xl font-bold text-white tracking-tight">Synthsynd</span>
        </Link>
      </div>
      
      <nav className="flex-1 px-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link 
            key={item.name} 
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition text-sm font-medium ${
              pathname === item.href ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-900 hover:text-white'
            }`}
          >
            <span className="opacity-70">{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <WalletButton />
      </div>
    </aside>
  );
}