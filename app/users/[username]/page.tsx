import { supabase } from '../../../utils/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function PublicProfile({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = await params;
  const username = resolvedParams.username;

  // 1. Get the wallet address for this username
  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_address')
    .eq('username', username)
    .single();

  if (!profile) notFound();

  // 2. Get all items created by this wallet
  const { data: items } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', profile.wallet_address)
    .order('created_at', { ascending: false });

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto">
      <div className="mb-12 border-b border-gray-800 pb-8">
        <h1 className="text-4xl font-bold mb-2">@{username}</h1>
        <p className="text-gray-400 font-mono text-sm">Wallet: {profile.wallet_address}</p>
      </div>

      <h2 className="text-2xl font-bold mb-6">Published Items</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items && items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-600 transition flex flex-col h-full">
              <div className="h-40 bg-gray-800 rounded-xl mb-4 overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">No Image</div>
                )}
              </div>
              <h3 className="text-lg font-bold mb-2 truncate">{item.name}</h3>
              <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-grow">{item.description}</p>
              <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-800">
                <span className="text-white font-bold">
                  {item.is_free ? "FREE" : `${item.price_usd || 0} $SSDY`}
                </span>
                <Link href={`/agent/${item.id}`} className="text-sm bg-gray-800 px-4 py-1.5 rounded-lg hover:bg-gray-700 transition">
                  View
                </Link>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 col-span-full">No items published yet.</p>
        )}
      </div>
    </div>
  );
}