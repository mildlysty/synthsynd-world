import { supabase } from '../../../utils/supabase';
import { notFound } from 'next/navigation';
import BuyButton from '../../components/BuyButton';

export default async function Agent({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const { data: agent } = await supabase.from('agents').select('*').eq('id', p.id).single();
  if (!agent) notFound();

  return (
    <div className="p-10 max-w-5xl mx-auto flex gap-10">
      <div className="flex-1">
        <h1 className="text-4xl font-bold mb-4">{agent.name}</h1>
        <p className="text-gray-400 text-lg whitespace-pre-wrap">{agent.description}</p>
      </div>
      <div className="w-80">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sticky top-10">
          <div className="h-48 bg-gray-800 rounded-xl mb-4 overflow-hidden">
            {agent.image_url && <img src={agent.image_url} className="w-full h-full object-cover" />}
          </div>
          <h2 className="text-2xl font-bold mb-4">{agent.is_free ? 'FREE' : `${agent.price_usd} $SSDY`}</h2>
          <BuyButton sellerWallet={agent.user_id} price={agent.price_usd} />
        </div>
      </div>
    </div>
  );
}