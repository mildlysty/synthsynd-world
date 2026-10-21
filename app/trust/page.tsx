import Link from 'next/link';

const principles = [
  {
    title: 'Listings come from their creators',
    body: 'Creators submit listing descriptions, files, and service links. Moderation may review or remove content, but publication does not mean the listing has been independently audited or endorsed.',
  },
  {
    title: 'Review before checkout',
    body: 'Read the listing details, price, and seller information before buying. Paid checkout uses Stripe Connect; payment availability and payout timing depend on Stripe and the seller account.',
  },
  {
    title: 'Wallet actions stay in your wallet',
    body: 'A wallet is optional for browsing and account sign-in. When an on-chain feature is used, review the transaction in your wallet. Synthsynd World does not ask for a seed phrase or private key.',
  },
  {
    title: 'Third-party services operate independently',
    body: 'A listing may link to an external API, website, or smart contract. Its operator controls availability, response quality, and any separate terms or charges.',
  },
];

export default function TrustPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-12 text-zinc-100 sm:px-8">
      <Link href="/" className="text-sm text-cyan-200 underline underline-offset-4 hover:text-cyan-100">← Synthsynd World</Link>
      <p className="mt-10 text-sm font-semibold uppercase tracking-[.16em] text-cyan-200">Trust & safety</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">What to expect from listings</h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-300">These notes describe current marketplace practices. They do not guarantee that a listing is safe, accurate, or suitable for a particular purpose.</p>
      <div className="mt-9 space-y-4">
        {principles.map((item) => <section key={item.title} className="rounded-2xl border border-white/10 bg-zinc-950 p-6"><h2 className="text-lg font-semibold">{item.title}</h2><p className="mt-3 text-sm leading-6 text-zinc-300">{item.body}</p></section>)}
      </div>
      <section className="mt-8 rounded-2xl border border-cyan-100/15 bg-cyan-100/[0.04] p-6">
        <h2 className="text-lg font-semibold">Report a concern</h2>
        {contactEmail ? <p className="mt-3 text-sm leading-6 text-zinc-300">Email <a className="text-cyan-200 underline underline-offset-4" href={`mailto:${contactEmail}`}>{contactEmail}</a> with the listing URL and a short description of the issue.</p> : <p className="mt-3 text-sm leading-6 text-zinc-300">A direct report email has not been configured yet. Add `NEXT_PUBLIC_CONTACT_EMAIL` before promoting this policy as the support channel.</p>}
      </section>
    </main>
  );
}
