import { supabase } from '../../../utils/supabase';
import { notFound } from 'next/navigation';
import BuyButton from '../../components/BuyButton';
import Reviews from '../../components/Reviews';
import ListingContent from '../../components/ListingContent';
import LaunchTokenButton from '../../components/LaunchTokenButton';
import CreatorFeeClaim from '../../components/CreatorFeeClaim';
import X402Invoke from '../../components/X402Invoke';

export default async function Agent({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const { data: agent } = await supabase
    .from('agents')
    .select('id,name,description,image_url,price_usd,is_free,user_id,owner_id,created_at,statusType,token_address,token_symbol,fee_selection,vault_mode,token_creator_wallet,mcp_server_url,x402_url,category,tags,language')
    .eq('id', p.id)
    .single();
  if (!agent) notFound();

  const listingType = String(agent.statusType || 'agent').toLowerCase();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 text-zinc-100 lg:flex-row lg:px-8">
      <div className="min-w-0 flex-1">
        <p className="text-sm uppercase tracking-wide text-cyan-300">{agent.statusType || 'Agent'} listing</p>
        <h1 className="mb-4 mt-2 text-4xl font-bold">{agent.name}</h1>
        <p className="whitespace-pre-wrap text-lg leading-8 text-zinc-400">{agent.description}</p>
        {agent.category && <p className="mt-4 text-sm text-zinc-500">Category: {agent.category}{agent.language ? ` · ${agent.language}` : ''}</p>}
        {agent.x402_url && <X402Invoke endpoint={agent.x402_url} />}
        {agent.tags?.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{agent.tags.map((tag: string)=><span key={tag} className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">{tag}</span>)}</div>}
        {agent.statusType === 'mcp' && agent.mcp_server_url && <a href={agent.mcp_server_url} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-lg border border-emerald-800 px-4 py-2 text-sm text-emerald-300">Open MCP server ↗</a>}
        {['agent','prompt','tool','skill'].includes(listingType) && <ListingContent id={agent.id} type={listingType} isFree={agent.is_free} />}
        <Reviews agentId={agent.id} />
        {agent.token_address && <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5"><h2 className="font-semibold">Token</h2><p className="mt-2 font-mono text-sm text-zinc-400">{agent.token_symbol ? `$${agent.token_symbol} · ` : ''}{agent.token_address}</p><p className="mt-2 text-sm text-zinc-500">{agent.fee_selection === 'frenzy' ? 'Frenzy creator fee' : 'Standard creator fee'}{agent.vault_mode ? ' · holder-gated access' : ''}</p></section>}
        {agent.token_address && agent.owner_id && agent.token_creator_wallet && <CreatorFeeClaim listingId={agent.id} creatorId={agent.owner_id} creatorWallet={agent.token_creator_wallet} />}
        {listingType === 'agent' && !agent.token_address && <LaunchTokenButton listingId={agent.id} name={agent.name} description={agent.description || ''} ownerId={agent.owner_id || ''} />}
      </div>
      <div className="w-full lg:w-96">
        <div className="sticky top-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-4 h-52 overflow-hidden rounded-xl bg-zinc-900">
            {agent.image_url && <img src={agent.image_url} alt="" className="h-full w-full object-cover" />}
          </div>
          <h2 className="mb-4 text-2xl font-bold">{agent.is_free ? 'Free access' : `$${Number(agent.price_usd || 0).toFixed(2)} USD`}</h2>
          <BuyButton listingId={agent.id} price={agent.price_usd} isFree={agent.is_free} />
          <p className="mt-3 text-xs leading-5 text-zinc-500">Payments use Stripe Checkout; the creator must complete payout onboarding. Blockchain token purchases require a separate Solana launch integration.</p>
        </div>
      </div>
    </div>
  );
}
