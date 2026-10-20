import { supabase } from '../../../utils/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BuyButton from '../../../components/BuyButton';

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', resolvedParams.id)
    .single();

  if (!agent) notFound();

  // Calculate fake stats based on description length for the UI
  const descLength = agent.description?.length || 0;
  const wordCount = agent.description?.split(' ').length || 0;
  const tokenCount = Math.floor(wordCount * 1.3);

  return (
    <div className="min-h-screen bg-black text-white p-6 lg:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* TOP BREADCRUMB */}
        <div className="mb-6 text-sm text-gray-500">
          <Link href="/" className="hover:text-white">Marketplace</Link> 
          <span className="mx-2">/</span> 
          <span className="capitalize">{agent.statusType || 'Item'}</span> 
          <span className="mx-2">/</span> 
          <span className="text-white">{agent.name}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* LEFT COLUMN - MAIN CONTENT */}
          <div className="flex-1 min-w-0">
            
            {/* TABS */}
            <div className="flex overflow-x-auto border-b border-gray-800 mb-6 hide-scrollbar">
              {['Main Prompt', 'Security', 'Chat', 'Images', 'Summary', 'Ratings', 'Metadata'].map((tab, i) => (
                <button key={tab} className={`px-6 py-3 whitespace-nowrap text-sm font-semibold transition border-b-2 ${i === 0 ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                  {tab} {i > 0 && <span className="ml-2 text-xs bg-gray-800 px-2 py-0.5 rounded-full">{i + 1}</span>}
                </button>
              ))}
            </div>

            {/* ACTION BAR & STATS */}
            <div className="flex flex-wrap gap-4 mb-6">
              <button className="flex items-center gap-2 bg-gray-900 border border-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition">
                📄 Copy
              </button>
              <button className="flex items-center gap-2 bg-gray-900 border border-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition">
                ⬇️ Download
              </button>
            </div>

            <div className="flex gap-4 text-sm text-gray-400 bg-gray-900 border border-gray-800 rounded-lg p-3 mb-8">
              <span><span className="text-gray-600 mr-1">T</span> Characters {descLength.toLocaleString()}</span>
              <span><span className="text-gray-600 mr-1">≡</span> Words {wordCount}</span>
              <span><span className="text-gray-600 mr-1">#</span> ~Tokens {tokenCount.toLocaleString()}</span>
              <span><span className="text-gray-600 mr-1">💾</span> Size {(descLength / 1024).toFixed(1)} kb</span>
            </div>

            {/* VIEW MODES */}
            <div className="flex gap-4 border-b border-gray-800 mb-6">
              {['Preview', 'Prompt API', 'Markdown', 'Text', 'Framework', 'API'].map((mode, i) => (
                <button key={mode} className={`pb-3 text-sm font-semibold ${i === 0 ? 'text-white border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'}`}>
                  {mode}
                </button>
              ))}
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-8">
              <h1 className="text-3xl font-bold mb-6">{agent.name}</h1>
              <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap leading-relaxed">
                {agent.description}
              </div>
            </div>

            {/* REVIEWS SECTION (We built this earlier) */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-4">Ratings</h2>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-500">
                Reviews component goes here.
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN - STICKY SIDEBAR */}
          <div className="w-full lg:w-[400px] shrink-0">
            <div className="sticky top-10 space-y-6">
              
              {/* IMAGE CARD */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="aspect-square bg-gray-800 relative">
                  {agent.image_url ? (
                    <img src={agent.image_url} alt={agent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">No Image</div>
                  )}
                </div>
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-1">{agent.name}</h2>
                  <p className="text-gray-400 text-sm mb-4 capitalize">Creator: {agent.user_id?.slice(0,6)}...{agent.user_id?.slice(-4)}</p>
                  
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Price</div>
                      <div className="text-3xl font-bold text-purple-400">
                        {agent.is_free ? "FREE" : `${agent.price_usd || 0} $SSDY`}
                      </div>
                    </div>
                  </div>

                  <BuyButton sellerWallet={agent.user_id} price={agent.price_usd || 0} />
                </div>
              </div>

              {/* POOL ADDRESS (MOCK) */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Pool Address:</span>
                  <button className="text-gray-500 hover:text-white">📋</button>
                </div>
                <a href="#" className="text-purple-400 text-sm break-all hover:underline">
                  An2eRY...Udmp (Mock Address) ↗
                </a>
              </div>

              {/* BUY ON EXTERNAL */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2">🛒 Buy on</h3>
                <div className="space-y-2">
                  {['GMGN', 'Axiom', 'Jupiter', 'Dexscreener'].map((platform) => (
                    <button key={platform} className="w-full flex items-center justify-center gap-2 bg-black border border-gray-700 rounded-lg py-3 text-sm font-semibold hover:bg-gray-800 transition">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-blue-500"></div>
                      Buy on {platform}
                    </button>
                  ))}
                </div>
              </div>

              {/* TRADE WIDGET (MOCK) */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2">🔄 Trade</h3>
                <div className="flex bg-black rounded-lg p-1 mb-4 border border-gray-800">
                  <button className="flex-1 bg-gray-800 text-white rounded-md py-2 text-sm font-bold">Buy</button>
                  <button className="flex-1 text-gray-500 hover:text-white py-2 text-sm font-bold">Sell</button>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>SOL Amount</span>
                    <span>Balance: 0.00</span>
                  </div>
                  <input type="number" placeholder="0.00" className="w-full bg-black border border-gray-700 rounded-lg p-3 text-right text-white font-mono focus:outline-none focus:border-purple-500" />
                </div>
                <button className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition">
                  Connect Wallet
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}