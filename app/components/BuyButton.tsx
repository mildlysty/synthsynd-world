export default function BuyButton({ isFree }: { listingId?: string; bundleId?: string; price?: number; isFree: boolean }) {
  return (
    <>
      {isFree ? <a href="#listing-content" className="block w-full rounded-xl border border-emerald-800 bg-emerald-950/30 py-3 text-center font-semibold text-emerald-300 hover:bg-emerald-950/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">View free content ↓</a> : <div className="rounded-xl border border-amber-800 bg-amber-950/20 p-4 text-sm leading-6 text-amber-100">Paid checkout is temporarily unavailable while INR payments and creator payouts are being set up. No payment will be taken.</div>}
    </>
  );
}
