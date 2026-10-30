import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "../../../_lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Sign in with the account used for checkout to view this purchase." }, { status: 401 });
  const { orderId } = await params;
  if (!/^sw_[a-f0-9]{32}$/.test(orderId)) return NextResponse.json({ error: "Invalid YouPI order ID." }, { status: 400 });

  const { data, error } = await auth.supabase.from("marketplace_purchases")
    .select("listing_id,bundle_id,status,amount_total,currency,paid_at")
    .eq("buyer_id", auth.user.id).eq("youpi_order_id", orderId).eq("payment_gateway", "youpi").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load purchase status." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
  return NextResponse.json({ purchase: data }, { headers: { "Cache-Control": "no-store" } });
}
