'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import ProfileEditor from '../components/ProfileEditor';

export default function Dashboard() {
  const { publicKey } = useWallet();

  if (!publicKey) return <div className="p-10 text-center">Connect Wallet to view Dashboard</div>;

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <ProfileEditor />
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800"><h3 className="text-gray-400">Agents</h3><p className="text-4xl font-bold">0</p></div>
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800"><h3 className="text-gray-400">Prompts</h3><p className="text-4xl font-bold">0</p></div>
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800"><h3 className="text-gray-400">Tools</h3><p className="text-4xl font-bold">0</p></div>
      </div>
      <div className="mt-10 flex gap-4">
        <Link href="/create" className="bg-purple-600 px-6 py-3 rounded-xl font-bold">Publish Item</Link>
        <Link href="/profile" className="bg-gray-800 px-6 py-3 rounded-xl font-bold">Manage Items</Link>
      </div>
    </div>
  );
}