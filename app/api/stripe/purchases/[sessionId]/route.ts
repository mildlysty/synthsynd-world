import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "../../../_lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const auth = await getAuthenticatedSupabase(request);
  if (!auth) return NextResponse.json({ error: "Sign in to view this purchase." }, { status: 401 });
  const { sessionId } = await params;
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) return NextResponse.json({ error: "Invalid checkout session." }, { status: 400 });
  const { data, error } = await auth.supabase.from("marketplace_purchases")
    .select("listing_id,bundle_id,status,amount_total,currency,paid_at")
    .eq("buyer_id", auth.user.id).eq("stripe_session_id", sessionId).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load purchase status." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
  return NextResponse.json({ purchase: data });
}
