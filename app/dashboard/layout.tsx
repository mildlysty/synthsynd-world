'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletButton from '../components/WalletButton';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { publicKey } = useWallet();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Marketplace', href: '/', icon: '🛒' },
    { name: 'My Items', href: '/profile', icon: '🤖' },
    { name: 'Publish', href: '/create', icon: '🚀' },
  ];

  return (
    <div className="flex min-h-screen bg-black text-white font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-gray-800 bg-gray-900/50 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-800">
          <Link href="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Synthsynd World
          </Link>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-2">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
                pathname === item.href ? 'bg-purple-600/20 text-purple-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          {publicKey ? (
            <div className="text-sm text-green-400 break-all">
              {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
            </div>
          ) : (
            <WalletButton />
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden flex justify-between items-center p-4 border-b border-gray-800">
          <Link href="/" className="font-bold text-purple-400">Synthsynd</Link>
          <WalletButton />
        </header>
        
        <div className="p-6 md:p-10 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}